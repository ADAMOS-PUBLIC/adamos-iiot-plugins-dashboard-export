(function () {
  'use strict';

  angular
    .module('c8y.enhanced.dashboardUtils')
    .constant('dashboardUtilsConstants', {
      ZIP_PREFIX: 'dashboard',
      ZIP_EXTENSION: '.zip',
      DASHBOARD_KEYS_TO_BE_REMOVED: [
        'id',
        'lastUpdated',
        'owner',
        'additionParents',
        'childAdditions',
        'deviceParents',
        'childDevices',
        'assetParents',
        'childAssets',
        'creationTime',
        'self'
      ]
    });
}());
