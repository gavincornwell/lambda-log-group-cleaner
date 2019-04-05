"use strict";

const AWS = require("aws-sdk");
const lambda = new AWS.Lambda();
const cloudwatchlogs = new AWS.CloudWatchLogs();

exports.handler = (event, context, callback) => {
  console.log("Received event: " + JSON.stringify(event, null, 2));

  // build a map of function names currently deployed
  buildListOfFunctionNames([], null, function (error, functionNames) {
    if (error) {
      console.log(error, error.stack);
      callback(error);
    } else {
      console.log("Found " + functionNames.length + " functions.");
      console.log("Function names: " + functionNames);

      buildListOfGroupNames([], null, function (error, groupNames) {
        if (error) {
          console.log(error, error.stack);
          callback(error);
        } else {
          console.log("Found " + groupNames.length + " log groups.");
          console.log("Log group names: " + groupNames);

          var groupsProcessed = 0;
          var groupsIgnored = 0;
          var groupsDeleted = 0;
          var groupsFailed = 0;

          // iterate through log groups and look for associated lambda function
          for (let i = 0; i < groupNames.length; i++) {

            // strip prefix from group name
            let lambdaName = groupNames[i].substring(12);

            // look for name in list of functions
            var lambdaExists = functionNames.includes(lambdaName);

            // if missing, delete the log group
            if (lambdaExists) {
              groupsIgnored++;
              groupsProcessed++;
              console.log("Ignoring group " + groupNames[i] + " as the Lambda function exists");
            } else {
              console.log("Deleting group " + groupNames[i] + " as the Lambda function no longer exists...");

              var deleteGroupParams = {
                logGroupName: groupNames[i]
              };
              cloudwatchlogs.deleteLogGroup(deleteGroupParams, function (error) {
                groupsProcessed++;

                if (error) {
                  groupsFailed++;
                } else {
                  groupsDeleted++;
                }

                // if all groups have been processed, call the main callback with results
                if (groupsProcessed == groupNames.length) {
                  let result = {
                    groupsProcessed: groupsProcessed,
                    groupsIgnored: groupsIgnored,
                    groupsDeleted: groupsDeleted,
                    groupsFailed: groupsFailed
                  };
                  console.log("Returning result: " + JSON.stringify(result, null, 2));
                  callback(null, result);
                }
              });
            }
          }
        }
      });
    }
  });
};

var buildListOfFunctionNames = function (functionNames, nextMarker, functionNamesCallback) {

  let listFunctionsParams = {
    MaxItems: 25
  };

  if (nextMarker) {
    listFunctionsParams.Marker = nextMarker;
  }

  // console.log("Calling listFunctions with params: " + JSON.stringify(listFunctionsParams, null, 2));
  lambda.listFunctions(listFunctionsParams, function (error, data) {
    if (error) {
      console.log(error, error.stack);
      functionNamesCallback(error);
    } else {
      // console.log("Found " + data.Functions.length + " functions.");
      // console.log("listFunctions result: " + JSON.stringify(data, null, 2));

      for (var i = 0; i < data.Functions.length; i++) {
        functionNames.push(data.Functions[i].FunctionName);
      }

      if (data.NextMarker) {
        buildListOfFunctionNames(functionNames, data.NextMarker, functionNamesCallback);
      } else {
        functionNamesCallback(null, functionNames);
      }
    }
  });
};

var buildListOfGroupNames = function (groupNames, nextToken, logGroupNamesCallback) {

  let describeLogGroupsParams = {
    logGroupNamePrefix: "/aws/lambda/",
    limit: 25
  };

  if (nextToken) {
    describeLogGroupsParams.nextToken = nextToken;
  }

  // console.log("Calling describeLogGroups with params: " + JSON.stringify(describeLogGroupsParams, null, 2));
  cloudwatchlogs.describeLogGroups(describeLogGroupsParams, function (error, data) {
    if (error) {
      console.log(error, error.stack);
      logGroupNamesCallback(error);
    } else {
      // console.log("Found " + data.logGroups.length + " log groups.");
      // console.log("describeLogGroups result: " + JSON.stringify(data, null, 2));

      for (var i = 0; i < data.logGroups.length; i++) {
        groupNames.push(data.logGroups[i].logGroupName);
      }

      if (data.nextToken) {
        buildListOfGroupNames(groupNames, data.nextToken, logGroupNamesCallback);
      } else {
        logGroupNamesCallback(null, groupNames);
      }
    }
  });
};
