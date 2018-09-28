/*global define */
define(['jquery', 'underscore', 'backbone', 'd3', 'DonutChart', 'views/CitationView', 'text!templates/mdqRun.html', 'text!templates/mdqSuites.html', 'text!templates/loading.html', 'collections/QualityReport'],
	function($, _, Backbone, d3, DonutChart, CitationView, MdqRunTemplate, SuitesTemplate, LoadingTemplate, QualityReport) {
	'use strict';

	// Build the Footer view of the application
	var MdqRunView = Backbone.View.extend({

		el: '#Content',

		events: {
			//"click input[type='submit']"	:	"submitForm"
			//"change #suiteId" : "switchSuite"
		},

		url: null,
		pid: null,
		suiteId: null,
		loadingTemplate: _.template(LoadingTemplate),
		template: _.template(MdqRunTemplate),
		suitesTemplate: _.template(SuitesTemplate),

		initialize: function () {

		},

		render: function () {
			// use the default suite id 
            if (!this.suiteId) {
                this.suiteId = MetacatUI.appModel.get("mdqSuiteId");
            }
            
			//this.url = this.mdqRunsServiceUrl + "/" + this.suiteId + "/" + this.pid;
			var viewRef = this;

			if (this.pid) {
              this.showLoading();
              // Fetch a quality report from the quality server and display it.
              var viewRef = this;
              var qualityUrl = MetacatUI.appModel.get("mdqRunsServiceUrl") + viewRef.suiteId + "/" + viewRef.pid;
              var qualityReport = new QualityReport([], {url:qualityUrl, pid: viewRef.pid});
              qualityReport.fetch({url:qualityUrl});
                
              this.listenToOnce(qualityReport, "fetchComplete", function() {
                  // Inspect the results to see if a quality report was returned.
                  // If not, then submit a request to the quality engine to create the
                  // quality report for this pid/suiteId, and inform the user of this.

                var groupedResults = qualityReport.groupResults(qualityReport.models);
                var groupedByType = qualityReport.groupByType(qualityReport.models);
                //var data = _.extend(qualityReport.data,
                var data = {
                      objectIdentifier: qualityReport.id,
                      suiteId: qualityReport.suiteId,
                      groupedResults: groupedResults,
                      groupedByType: groupedByType,
                      timestamp: _.now(),
                      id: viewRef.pid,
                      checkCount: qualityReport.length
                };

                viewRef.$el.html(viewRef.template(data));
                viewRef.drawScoreChart(qualityReport.models, groupedResults);
                //viewRef.showAvailableSuites()  ;
                viewRef.showCitation();
                viewRef.show();
                //Initialize all popover elements
                viewRef.$('.popover-this').popover();
              });
			} else {
				this.$el.html(this.template({}));
			}
		},

		showLoading: function() {
			this.$el.html(this.loadingTemplate({ msg: "Retreiving quality report..."}));
		},
        
        hideLoading: function() {
            if(this.$loading)  this.$loading.remove();
            if(this.$detached) this.$el.html(this.$detached);
        },

		showCitation: function(){
			if(!this.citationView) return false;

			this.$("#mdqCitation").prepend(this.citationView.el);
		},

		show: function() {
			var view = this;
			this.$el.hide();
			this.$el.fadeIn({duration: "slow"});
		},

		drawScoreChart: function(results, groupedResults){

			var dataCount = results.length;
			var data = [
			            {label: "Pass", count: groupedResults.GREEN.length, perc: groupedResults.GREEN.length/results.length },
			            {label: "Warn", count:  groupedResults.ORANGE.length, perc: groupedResults.ORANGE.length/results.length},
			            {label: "Fail", count: groupedResults.RED.length, perc: groupedResults.RED.length/results.length},
			            {label: "Info", count: groupedResults.BLUE.length, perc: groupedResults.BLUE.length/results.length},
			        ];
                    
			var svgClass = "data";

			//If d3 isn't supported in this browser or didn't load correctly, insert a text title instead
			if(!d3){
				this.$('.format-charts-data').html("<h2 class='" + svgClass + " fallback'>" + MetacatUI.appView.commaSeparateNumber(dataCount) + " data files</h2>");

				return;
			}

			//Draw a donut chart
			var donut = new DonutChart({
							id: "data-chart",
							data: data,
							total: dataCount,
							titleText: "checks",
							titleCount: dataCount,
							svgClass: svgClass,
							countClass: "data",
							height: 250,
							width: 250,
							keepOrder: true,
							formatLabel: function(name) {
								return name;
							}
						});
			this.$('.format-charts-data').html(donut.render().el);
		}

	});
	return MdqRunView;
});
