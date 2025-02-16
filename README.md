# openiap assistant

Allows easily creating boiler plate code, generate tokens and publish agent code for openiap flow or testing SDK's

## Features

Manage connections to multiple openflow instance 
Pack code, using npm
Pack and upload packages to openflow
Add boiler plate code ( comming soon )

# Getting started
See getting started guide at 
## Extension Settings

This extension currently have the following settings:

* `openiap.flow.credentials`: List of openflow instances you can push to

You Command palette and search for "openiap" for a list of commands.
* `addflowconfig`: Add connection to openflow, prompts to overwrite
* `deleteflowconfig`: Remove an existing connection to openflow
* `packproject`: Creates tar file with current project in root of workspace
* `pushproject`: Prompts for connection, create and uploads tar file and then cleans up
* `initproject`: Prompts for connection, if folder is empty, prompts example, then ensures credentials are set
* `initprojectforce`: Prompts for connection, prompts example, then ensures credentials are set, overwrites existing files
