/* global define */
define(['jquery', 'underscore', 'backbone', 'rdflib', "uuid", "md5",
    'models/QualityCheckModel'
  ],
  function ($, _, Backbone, rdf, uuid, md5, QualityCheck) {

    /*
     A DataPackage represents a hierarchical collection of
     packages, metadata, and data objects, modeling an OAI-ORE RDF graph.
     TODO: incorporate Backbone.UniqueModel
    */
    var QualityReport = Backbone.Collection.extend({

      //The name of this type of collection
      type: "QualityReport",

      // The package identifier
      suiteId: MetacatUI.appModel.get("suiteId"),

      initialize: function (models, options) {
        if (typeof options == "undefined")
          var options = {};

        //Set the id or create a new one
        this.id = options.pid || "urn:uuid:" + uuid.v4();

        //this.on("add", this.handleAdd);
        //this.on("successSaving", this.updateRelationships);

        return this;
      },

      /*
       * The QualityReport collection stores a metadata quality
       * report that is generated from the MetaDIG quality engine.
       */
      model: QualityCheck,
      
      parse: function(response, options) {
        return response.result;
      },
      
      fetch: function(options) {
        var collectionRef = this;
        var fetchOptions = {};
        if((typeof options != "undefined")) {
          fetchOptions = _.extend(options, {
              url: options.url,
              cache: false,
              contentType: false, //"multipart/form-data",
              processData: false,
              type: 'GET',
              //headers: { 'Access-Control-Allow-Origin': 'http://localhost:8081' },
              headers: {
                'Accept': 'application/json'
              },
              success: function (data, textStatus, xhr) {
                //collectionRef.run = data;
                collectionRef.trigger("fetchComplete");
              },
              error: function (data) {
                console.debug("quality report not found.");
                //viewRef.prepareReportRequest();
              }
            });
          //Merge with the options passed to this function
          //var fetchOptions = _.extend(solrOptions, options);
          //Add the authorization options
          fetchOptions = _.extend(fetchOptions, MetacatUI.appUserModel.createAjaxSettings());
          //Call Backbone.Model.fetch to retrieve the info
          return Backbone.Collection.prototype.fetch.call(collectionRef, fetchOptions);
        }
      },
      
//       sync: function (method, collection, options) {
//         var collectionRef = this;
//      switch (method) {
//     case 'delete':
//     case 'read':
//     case 'update':
//       // handle update ...
//     case 'create':
//       var suitesUrl = MetacatUI.appModel.get("mdqSuitesServiceUrl") + collectionRef.suiteId + "/run";
//       console.debug("quality suites url: " + suitesUrl);
//       var args = {
//         url: suitesUrl,
//         cache: false,
//         data: formData,
//         contentType: false, //"multipart/form-data",
//         processData: false,
//         type: 'POST',
//         success: function (data, textStatus, jqXHR) {
//           console.debug("Sent quality report generation request");
//           collectionRef.hideLoading();
//           var msgText = "A quality report is not yet available for this dataset, so";
//           msgText += " one will be generated automatically. Please try again later.";
//           MetacatUI.uiRouter.navigate("#view" + "/" + collectionRef.pid, {
//             trigger: true
//           });
//           var message = $(document.createElement("div")).append($(document.createElement("span")).text(msgText));
//           //MetacatUI.appView.showAlert(message, "alert-success", "body", 10000, {
//           //  remove: true
//           //});
//         },
//         error: function (jqXHR, textStatus, errorThrown) {
//           console.debug("Error sending quality report generation request: " + errorThrown);
//           //viewRef.hideLoading();
//           var msgText = "A quality report is not yet available for this dataset, and";
//           msgText += " there was a problem attempting to generate one automatically: ";
//           msgText += errorThrown;
//           MetacatUI.uiRouter.navigate("#view" + "/" + collectionRef.pid, {
//             trigger: true
//           });
//           var message = $(document.createElement("div")).append($(document.createElement("span")).text(msgText));
//           //MetacatUI.appView.showAlert(message, "alert-errors", "body", 10000, {
//           //  remove: true
//           //});
//         }
//       };
// 
//       //options.url = '/api/orders/cancelOrder';
//       return Backbone.sync(method, model, options);
//       //handle create ...
//   }
//   return Backbone.Collection.prototype.sync.call(this, fetchOptions);
// },   


      groupResults: function (results) {
        var total = results.length;
        var groupedResults = _.groupBy(results, function (result) {
          var color;

          var check = result.get("check");
          var status = result.get("status");
          // simple cases
          // always blue for info and skip
          if (check.level == 'INFO') {
            color = 'BLUE';
            return color;
          }
          if (status == 'SKIP') {
            color = 'BLUE';
            return color;
          }
          // always green for success
          if (status == 'SUCCESS') {
            color = 'GREEN';
            return color;
          }

          // handle failures and warnings
          if (status == 'FAILURE') {
            color = 'RED';
            if (check.level == 'OPTIONAL') {
              color = 'ORANGE';
            }
          }
          if (status == 'ERROR') {
            color = 'ORANGE';
            if (check.level == 'REQUIRED') {
              color = 'RED';
            }
          }
          return color;
        });

        // make sure we have everything, even if empty
        if (!groupedResults.BLUE) {
          groupedResults.BLUE = [];
        }
        if (!groupedResults.GREEN) {
          groupedResults.GREEN = [];
        }
        if (!groupedResults.ORANGE) {
          groupedResults.ORANGE = [];
        }
        if (!groupedResults.RED) {
          groupedResults.RED = [];
        }

        if (groupedResults.BLUE) {
          total = total - groupedResults.BLUE.length;
        }

        return groupedResults;
      },

      groupByType: function (results) {
        var groupedResults = _.groupBy(results, function (result) {
            
          var check = result.get("check");
          var status = result.get("status");

          if (status == "ERROR" || status == "SKIP") {
            // orange or blue
            return "removeMe";
          }
          if (status == "FAILURE" && check.level == "OPTIONAL") {
            // orange
            return "removeMe";
          }

          return check.type || "uncategorized";
        });

        // get rid of the ones that should not be counted in our totals
        delete groupedResults["removeMe"];

        return groupedResults;
      }
  });
  return QualityReport;
});