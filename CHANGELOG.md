# Change Log

## [0.0.40]
 - Update default repos, fix order
 - Preserve .env file when force re-initilizing project
## [0.0.39]
 - Update default repos
## [0.0.38]
 - make publish less restrictive (allow changing language, author and any openiap settings)
 - load repos at start, and update default repo list
## [0.0.37]
 - Cleanup commands
 - Add dynamic template selector for initializing projects
 - Add support for any language when publishing to openiap
 - Add "force" new forced re-initilization of project, for fast example switching
 - We now prefer using .env files over embedding url and tokens in launch.json
## [0.0.36]
 - Add support for ports in package.json
## [0.0.35]
 - Add support for package.json just for the npm package, by adding a package.openiap.json file to the root of the project
## [0.0.32]
 - Fix issue with default dotnet project, better error handling with init project for updating connection strings
## [0.0.31]
 - Update api for REST fixes, pipe more info to openiap output window
## [0.0.30]
 - Update python example
## [0.0.29]
 - More fixes for paths on windows
## [0.0.28]
 - by pass windows fake python exe
## [0.0.27]
 - fix for multiline path
## [0.0.26]
 - fix executing when command path contain spaces
## [0.0.25]
 - fix python detection with no package.json
## [0.0.24]
 - Fix issue with findinpath function
## [0.0.23]
 - add .gitignore for empty projects
## [0.0.22]
 - Always add requirements when init empty workspace
## [0.0.21]
 - Add port support in package.json/openiap
## [0.0.20]
 - on init in emtpy project, detect if npm and python installed before adding examples
 - on init in emtpy project, also run pip install if python example was added
## [0.0.19]
 - Keep dialog open while adding new connection if tabbing away
 - fix username/password with special charecters
## [0.0.18]
 - Compare on name not webdomain when adding new config
## [0.0.17]
 - Hide password doing add openiap instance
## [0.0.16]
 - Add example files on empty project
 - Improve language detection
 - Improve launch.json generation

## [0.0.15]
 - Fix error with always updating package.json name

## [0.0.14]
- Add option to create/update package.json and launch.json
- Fix issues with creating openiap instance's with username
- Add name to openiap instance based of apiurl and username

## [0.0.13]

- Fix detecting dotnet projects
- Initial release
- Fix error when using non secure apiurl after choosing grpc
- Fix project settings not getting populated to openflow
- Fix issue with getting updates to package.json
- Fix issues with empty comfig / update for windows
- Close after getting user, update api