"use strict";

const AWS = require("aws-sdk");
const lambda = new AWS.Lambda();
const cloudwatchlogs = new AWS.CloudWatchLogs();

exports.handler = async (event) => {
  console.log("Received event: " + JSON.stringify(event, null, 2));

  try {
    // retrieve lists is parallel
    let results = await Promise.all([buildListOfFunctionNames(), buildListOfGroupNames()]);
    let functionNames = results[0];
    let groupNames = results[1];
    console.log("Found " + functionNames.length + " functions.");
    console.log("Found " + groupNames.length + " log groups.");

    // do the processing and return result
    var processingResults = await processLogGroups(functionNames, groupNames);
    console.log("Returning result: " + JSON.stringify(processingResults, null, 2));
    return processingResults;
  } catch (e) {
    throw new Error("Failed to clean log groups: " + e.message);
  }
};

var buildListOfFunctionNames = async () => {
  try {
    let functionNames = [];

    let nextMarker = null;
    let params = {
      MaxItems: 25
    };

    do {
      if (nextMarker !== null) {
        params.Marker = nextMarker;
      }
      let data = await lambda.listFunctions(params).promise();
      //console.log("listFunctions response: " + JSON.stringify(data, null, 2));
      for (var i = 0; i < data.Functions.length; i++) {
        functionNames.push(data.Functions[i].FunctionName);
      }
      nextMarker = data.NextMarker;
    } while (nextMarker !== null && nextMarker !== undefined);

    return functionNames;
  } catch (e) {
    throw e;
  }
};

var buildListOfGroupNames = async () => {
  try {
    let groupNames = [];

    let nextToken = null;
    let params = {
      logGroupNamePrefix: "/aws/lambda/",
      limit: 25
    };

    do {
      if (nextToken !== null) {
        params.nextToken = nextToken;
      }
      let data = await cloudwatchlogs.describeLogGroups(params).promise();
      //console.log("describeLogGroups response: " + JSON.stringify(data, null, 2));
      for (var i = 0; i < data.logGroups.length; i++) {
        groupNames.push(data.logGroups[i].logGroupName);
      }
      nextToken = data.nextToken;
    } while (nextToken !== null && nextToken !== undefined);

    return groupNames;
  } catch (e) {
    throw e;
  }
};

var processLogGroups = async (functionNames, groupNames) => {
  try {
    let groupsProcessed = 0;
    let groupsIgnored = 0;
    let groupsDeleted = 0;
    let groupsFailed = 0;

    // iterate through log groups and look for associated lambda function
    for (let i = 0; i < groupNames.length; i++) {
      groupsProcessed++;
      let groupName = groupNames[i];

      // strip prefix from group name
      let lambdaName = groupName.substring(12);

      // look for name in list of functions
      var lambdaExists = functionNames.includes(lambdaName);

      // if function is missing, delete the log group
      if (lambdaExists) {
        groupsIgnored++;
        console.log("Ignoring group " + groupName + " as the Lambda function exists");
      } else {
        console.log("Deleting group " + groupName + " as the Lambda function no longer exists...");

        var deleteGroupParams = {
          logGroupName: groupNames[i]
        };
        try {
          await cloudwatchlogs.deleteLogGroup(deleteGroupParams).promise();
          groupsDeleted++;
        } catch (deleteError) {
          console.log("Failed to delete group " + groupName);
          groupsFailed++;
        }
      }
    }

    // build and return result object
    return {
      groupsProcessed: groupsProcessed,
      groupsIgnored: groupsIgnored,
      groupsDeleted: groupsDeleted,
      groupsFailed: groupsFailed
    };
  } catch (e) {
    throw e;
  }
};