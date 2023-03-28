# Change Log

Initial release of vs code extension for easily creating openflow agent code or working with the SDK's


## [0.0.24]
 - Fix issue with findinpath function
## [0.0.23]
 - add .gitignore for empty projects
## [0.0.22]
 - Always add requirements when init empty workspace
## [0.0.21]
 - Add port support in project.json/openiap
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
 - Fix error with always updating project.json name

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