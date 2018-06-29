(function () {
  'use strict';

  angular
    .module('c8y.enhanced.dashboardUtils')
    .component('c8yDashboardImportZip', {
      templateUrl: ':::PLUGIN_PATH:::/modals/dashboardUpload.html',
      bindings: {
        close: '&',
        dismiss: '&'
      },
      controllerAs: 'vm',
      controller: Controller
    });

  /* @ngInject */
  function Controller(
    $q,
    c8yModal,
    c8yAlert,
    dashboardUtilsService
  ) {
    const vm = this;

    var processingStatus = {
      inProgress: false,
      progress: 0,
      label: null
    };

    _.assign(vm, {
       processingStatus,
       analyseDashboardZip
    });

    function analyseDashboardZip(file) {
      processingStatus.inProgress = true;
      processingStatus.progress = 0;
      var binaryPromises = [];
      var binaryNames = [];
      var dashboard;
      var manifest;
      JSZip.loadAsync(file)
        .then(function(zip) {
          zip.forEach(function(fileInZip) {
            if(fileInZip === 'dashboard.json') {
              dashboard = fileInZip;
            } else if(fileInZip === 'cumulocity.json') {
              manifest = fileInZip;
            } else {
              binaryNames.push(fileInZip);
              binaryPromises.push(zip.file(fileInZip).async('blob'));
            }
          });
          if (dashboard && manifest) {
            return $q.all(binaryPromises).then(function(binaryResults) {
              var binaries = [];
              _.forEach(binaryResults, function(singleBinary, index) {
                binaries.push(new File([singleBinary], binaryNames[index]));
              });
              return {
                binaries,
                dashboard,
                manifest,
                zip
              }
            });
          }
        })
        .then(resolveManifest)
        .then(resolveDashboard)
        .then(goToConfiguration);
    }

    function goToConfiguration(result) {
      processingStatus.progress = 100;
      vm.close();
      dashboardUtilsService.popupConfigureImportedDashboard(result);
    }

    function resolveManifest(dashboardContent) {
      return dashboardContent.zip.file(dashboardContent.manifest).async('string').then(function(file) {
        dashboardContent.manifest = angular.fromJson(file);
        return dashboardContent;
      });
    }
    function resolveDashboard(dashboardContent) {
      return dashboardContent.zip.file(dashboardContent.dashboard).async('string').then(function(file) {
        dashboardContent.dashboard = file;
        return dashboardContent;
      });
    }
  }
}());
