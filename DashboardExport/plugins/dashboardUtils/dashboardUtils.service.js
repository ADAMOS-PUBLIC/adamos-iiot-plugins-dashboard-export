(function () {
  'use strict';

  angular
    .module('c8y.enhanced.dashboardUtils')
    .factory('dashboardUtilsService', dashboardUtilsService);

  /* @ngInject */
  function dashboardUtilsService(
    $q,
    $routeParams,
    c8yInventory,
    c8yBinary,
    c8yModal,
    c8yAlert,
    dashboardUtilsConstants
  ) {
    const service = {
      exportDashboard,
      popupImportDashboard,
      popupConfigureImportedDashboard
    };

    const CONSTANTS = dashboardUtilsConstants;

    return service;

    ////////////
    function cleanseDashboardJson(dashboard) {
      dashboard = dashboard.data
      _.forEach(CONSTANTS.DASHBOARD_KEYS_TO_BE_REMOVED, function(key) {
        delete dashboard[key];
      });
      return {
        data: dashboard
      };
    }

    function getDeviceReferenceAndAddToManifest(manifestDevices, currentDeviceId) {
      var deviceReference;
      if (manifestDevices[currentDeviceId]) {
        deviceReference = manifestDevices[currentDeviceId].value
      } else {
        deviceReference = 'device' + (Object.keys(manifestDevices).length + 1);
        manifestDevices[currentDeviceId] = {
          value: deviceReference,
          widgets: [],
          datapoints: []
        }
      }
      return deviceReference;
    }

    function getBinaryReferenceAndAddToManifest(manifestBinaries, currentBinaryId) {
      var binaryReference;
      if (manifestBinaries[currentBinaryId]) {
        binaryReference = manifestBinaries[currentBinaryId].value
      } else {
        binaryReference = 'binary' + (Object.keys(manifestBinaries).length + 1);
        manifestBinaries[currentBinaryId] = {
          value: binaryReference
        }
      }
      return binaryReference;
    }

    function detectDevices(dashboard) {
      var devices = {};
      _.forEach(dashboard.data.c8y_Dashboard.children, function(widget, key, widgets) {
        // Device reference in general widget configuration
        if (_.has(widget, ['config', 'device'])) {
          var currentDeviceId = widget.config.device.id;
          var newDeviceString = getDeviceReferenceAndAddToManifest(devices, currentDeviceId);
          devices[currentDeviceId].widgets.push(widget.title);
          widgets[key].config.device = {id: '{{' + newDeviceString + '}}'};
        }
        // Device reference in a datapoint configured in the widget
        if (_.has(widget, ['config', 'datapoints'])) {
          _.forEach(widgets[key].config.datapoints, function(datapoint, index, datapoints) {
            var currentDeviceId = datapoint.__target.id;
            var newDeviceString = getDeviceReferenceAndAddToManifest(devices, currentDeviceId);
            devices[currentDeviceId].datapoints.push(datapoint.label);
            devices[currentDeviceId].widgets.push(widget.title);
            datapoints[index].__target = {id: '{{' + newDeviceString + '}}'};
          });
        }
        // Device reference in scada widget configuration for deviceIds
        if (_.has(widget, ['config', 'deviceIds'])) {
          _.forEach(widgets[key].config.deviceIds, function(currentDeviceId, key, deviceIds) {
            var newDeviceString = getDeviceReferenceAndAddToManifest(devices, currentDeviceId);
            devices[currentDeviceId].widgets.push(widget.title);
            deviceIds[key] = '{{' + newDeviceString + '}}';
          });
        }
        // Device reference in scada widget configuration for datapoint mappings
        if (_.has(widget, ['config', 'mapping'])) {
          _.forEach(widgets[key].config.mapping, function(datapoint, datapointName, mapping) {
            var activeDatapoint = [];
            if (_.has(mapping[datapointName], ['config', 'dp'])) {
              _.forEach(mapping[datapointName].config.dp, function(value) {
                if (value.__active == true) {
                  var newDeviceString = getDeviceReferenceAndAddToManifest(devices, value.__target.id);
                  value.__target.id = '{{' + newDeviceString + '}}';
                  delete value.__target.name;
                  activeDatapoint.push(value);
                }
              });
              mapping[datapointName].config.dp = activeDatapoint;
            }
          });
        }
      });
      devices = _.values(devices);
      _.forEach(devices, function(device, index, devices) {
        devices[index].widgets = _.uniq(devices[index].widgets);
        devices[index].datapoints = _.uniq(devices[index].datapoints);
      });
      dashboard.manifest = _.orderBy(devices, 'value');
      return dashboard;
    }

    function detectBinaries(dashboard) {
      var binaries = {};
      _.forEach(dashboard.data.c8y_Dashboard.children, function(widget, key, widgets) {
        var currentBinaryId;
        var newBinaryString;
        if (_.has(widget, ['config', 'imageBinaryId'])) {
          currentBinaryId = widget.config.imageBinaryId;
          newBinaryString = getBinaryReferenceAndAddToManifest(binaries, currentBinaryId);
          widgets[key].config.imageBinaryId = '{{' + newBinaryString + '}}';
        } else if (_.has(widget, ['config', 'binaryId'])) {
          currentBinaryId = widget.config.binaryId;
          newBinaryString = getBinaryReferenceAndAddToManifest(binaries, currentBinaryId);
          widgets[key].config.imageBinaryId = '{{' + newBinaryString + '}}';
        }
      });
      dashboard.binaries = binaries;
      return dashboard;
    }

    function downloadBinaries(dashboard) {
      var promises = [];
      _.forEach(dashboard.binaries, function(binary, binaryId) {
        promises.push(c8yBinary.downloadAsDataUri(binaryId));
      });
      return $q.all(promises).then(function(binaryResults) {
        var binaries = _.values(dashboard.binaries);
        _.forEach(binaryResults, function(binaryData, index) {
          binaries[index].extension = resolveExtension(binaryData);
          binaries[index].data = c8yBinary.decodeDataUri(binaryData);
        });
        dashboard.binaries = binaries;
        return dashboard;
      });
    }

    function resolveExtension(binaryData) {
      var extension;
      var index = binaryData.indexOf(';');
      var dataType = binaryData.substr(0, index);
      if (dataType.includes('svg')) {
          extension = '.svg';
      } else {
          extension = '.' + dataType.substr(dataType.indexOf('/') + 1, index);
      }
      return extension;
    }

    function resolveDashboardType(dashboard) {
      var type;
      _.forEach(dashboard, function(value, key) {
        if (key.startsWith('c8y_Dashboard!type!')) {
          delete dashboard[key];
          type = 'deviceType';
        } else if (key.startsWith('c8y_Dashboard!group!')) {
          delete dashboard[key];
          type = 'group';
        } else if (key.startsWith('c8y_Dashboard!device!')) {
          delete dashboard[key];
          type = 'device'
        }
      });
      return type;
    }

    function generateManifest(dashboard) {
      var manifest = {};
      manifest.name = dashboard.data.c8y_Dashboard.name;
      manifest.type = resolveDashboardType(dashboard.data);
      manifest.devices = dashboard.manifest;
      dashboard.manifest = manifest;
      return dashboard;
    }

    function generateZip(dashboard) {
      var zip = new JSZip();
      zip.file('dashboard.json', angular.toJson(dashboard.data, 2));
      zip.file('cumulocity.json', angular.toJson(dashboard.manifest, 2));
      _.forEach(dashboard.binaries, function(binary) {
        zip.file(binary.value + binary.extension, binary.data, {binary: true});
      });
      zip.generateAsync({type:"blob"}).then(function(blob) {
        saveAs(blob, "dashboard.zip");
      });
    }

    function exportDashboard() {
      var dashboardId = $routeParams.dashboardId;
      c8yInventory.detail(dashboardId)
        .then(cleanseDashboardJson)
        .then(detectDevices)
        .then(detectBinaries)
        .then(downloadBinaries)
        .then(generateManifest)
        .then(generateZip)
    }

    function popupImportDashboard() {
      return c8yModal({
          component: 'c8yDashboardImportZip'
        });
    }

    function popupConfigureImportedDashboard(dashboard) {
      return c8yModal({
          component: 'c8yDashboardImportConfig',
          resolve: {
            dashboard: function() {
              return dashboard;
            }
          }
        });
    }
  }
}());
