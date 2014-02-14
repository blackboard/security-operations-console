# Security Operations Console

This application is a console for viewing, reviewing, and reporting on various security issues found in tools like:

* AppScan Source
* AppScan Standard
* Burp
* etc.

This application should be run as a user other than root, and login, for now, requires Crowd authentication
(atlassian). More information will be posted about this tool as we finalize our documentation.

# Configuration

Configuring the security operations console is fairly straight-forward, but there are a couple of pieces that need to
be called out.

## Creating Configuration Files

This tool utilizes the node.js config module [https://github.com/lorenwest/node-config], and as such, a configuration
file must be created in order for the console to function. To do so, take the following steps:

* Copy config/template.yaml to config/<yourfilename>.yaml
** Remember that for the config module, the default configuration file is default.yaml, and any other name will need to be explicitly stated at runtime
* Enter values for all configuration properties specified in the template file

## Installing AmCharts

You will also need to install amcharts, in order for the reporting functionality to work. AmCharts is a Client Side JavaScript
graphing library that this tool uses to visualize the data coming into the Operations Console. It right now has 3 different
reports:

* A report of the Dynamic Analysis issues quality findings, Valid vs False Positives
* A report of the Static Analysis issue quality findings, Valid vs False Positives
* A report of the issues coming in and being reviewed on a daily basis

To install AmCharts, please take the following action:

* Go to [http://www.amcharts.com/javascript-charts/], and click the Download or Buy button, depending on your use case
* Follow the steps on the subsequent pages, until you have the amcharts .zip file
* Unpack the amcharts folder in the .zip file into the /public/lib folder of this project
 
If you are using the free version, please make sure that the images folder is unpacked into /public/lib as well. 

NOTWITHSTANDING THE FOREGOING, YOU ARE FULLY RESPONSIBLE FOR COMPLYING WITH ALL TERMS OF THE AMCHARTS LICENSE AGREEMENT.

Once done, the application should be able to display the various reports that have been created.

# Running the Tool

Once configured, running the tool is fairly simple, just run the following commands:

        $ npm install
        $ nohup node $path_to_console/controllers/expressServer.js &

An example of a more robust method for starting the console is in **build/deploy_console.sh**. This script takes care of
assigning the correct configuration file, and cleans up the .css files that exist, due to a
stylus ([https://github.com/learnboost/stylus]) issue, which existed at the time this build script was created, that
does not recreate the .css files on page refresh even if the stylus is updated.

Additionally, keep in mind that if you want to use ports 80 and 443, you will need to run the command as root, or add the
sudo command to it, as follows

        $ npm install
        $ nohup sudo node $path_to_console/controllers/expressServer.js &


# Grunt Commands

This project uses Grunt for most of building. If you want to test the build, see a code-coverage report, please use the
built-in grunt commands. To install grunt on your machine, please follow the instructions on [http://gruntjs.com/].

* grunt test -- Runs jasmine-node against all of the node.js code (there is not currently unit testing done on client-side javascript)
* grunt coverage -- Runs an istanbul unit test coverage report in lcov format
* grunt cobertura -- Converts the lcov report to cobertura format
* grunt jsdoc -- Creates a jsdoc (using jsdoc3 format) for all the node.js code for the console