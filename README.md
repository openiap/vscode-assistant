# openiap assistent

Allows easily creating boiler plate code, generate tokens and publish agent code for openiap flow or testing SDK's

## Features

Manage connections to multiple openflow instance 
Pack code, using npm
Pack and upload packages to openflow
Add boiler plate code ( comming soon )

# Getting started
Open the project with the code you want to publish to an openiap flow instance.
Press F1 to open the palette and search/select "Add openiap flow instance"
Follow the guide to create a connection to an openiap flow instance to your global settings. This connection can be reused across all projects.
Next press F1 once more and search/select "Initialize project"
This will add/update your package.json ( only python and nodejs detection is working right now ) and set a "main" entry point and add the openiap settings.
If you have more than one openiap flow instance it will prompt for the one to use ( this way you can easily swap between instances using init )
This will also add/update your .vscode/launch.json file to run you main entry point and add the needed envoirment variables to connect to your select openiap flow instance

## Extension Settings

This extension currently have the following settings:

* `openiap.flow.credentials`: List of openflow instances you can push to

You Command palette and search for "openiap" for a list of commands.
* `addflowconfig`: Add connection to openflow, prompts to overwrite
* `deleteflowconfig`: Remove an existing connection to openflow
* `packproject`: Creates tar file with current project in root of workspace
* `pushproject`: Prompts for connection, create and uploads tar file and then cleans up
* `initproject`: Prompts for connection, and then add exmaple package.json and example configuration to launch.json
* `addpackageconfig`: Add an example configuration package.json
* `addlaunchconfig`: Prompts for connection if package.json exists, and then add an example configuration to launch.json


### 0.0.1

Initial push

