# Dashboard Export

This is a Cumulocity plugin that extends the Cockpit application to export/import Dashboards into/from a zip-file.

## How to build the plugin

Please refer to the Web developer's guide  for information on how to build and deploy branding plugins: https://docs.adamos.com/guides/web/introduction/

After installing npm and c8y please run the following commands from within then `ADAMOS_CORE` folder:

* `npm install`  // This will install npm dependencies
* `c8y install`  // This will install Cumulocity dependencies
* `c8y build:plugin dashboardUtils` // This will build the plugin

## How to upload the plugin

* Go to your tenant, open the Admnistration application and select Own Applications.
* Select _Add application_ / _Clone exsiting application_ / _Cockpit_ / _Clone_
* Edit the newly cloned Cockpit app
* Select the _Plugins_ tab
* Upload the zip-file `cumulocity-enhanced-ui_dashboardUtils.zip` from the build directory.
* Open the Cockpit app to see your changes
