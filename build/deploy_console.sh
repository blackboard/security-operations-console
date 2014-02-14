################################################################################
# Script to deploy the node.js Security Operations Console. To occur once all  #
# automated acceptance tests have been completed.                              #
#                                                                              # 
# Parameters:                                                                  #
#   $1 - The path to the node code                                             #
#   $2 - The environment type, sandbox or production                           #
################################################################################

#
# function to configure the environment for starting node.js. It primarily
# works to configure the configuration directory and environment type, so that
# the correct .yaml config file can be picked up.
#
# Parameters:
#   $1 - The path to the node code
#   $2 - The environment name
#
function configureEnvironment
{
  # Making human readable variable names for the sake of clarity
  path_to_node=$1
  environment=$2
  
  # Exports necessary for deploying the console properly 
  export NODE_CONFIG_DIR=$path_to_node/config
  export NODE_ENV=$environment
}

#
# function that actually deploys the operations console.
#
# Parameters:
#   $1 - The path to the node code
#
function deployConsole
{
  # Making human readable variable names for the sake of clarity
  path_to_node=$1
  
  # Removing all CSS files, so the stylus is recompiled
  rm -f $path_to_node/public/*.css
  #Deploying the Security Operations Console
  nohup /usr/local/bin/node $path_to_node/controllers/expressServer.js &
}

# find previous instance of the console, if exists
prev=`ps -ef | grep controllers/expressServer.js | grep -v grep | cut -d ' ' -f3`

#kill any existing consoles running on this server
if [ ! -z $prev ]; then
  kill -9 $prev
fi

#Deploying the console
configureEnvironment $1 $2
deployConsole $1