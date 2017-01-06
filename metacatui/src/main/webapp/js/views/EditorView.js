﻿/* global define */
define(['underscore', 
        'jquery', 
        'backbone',
        'collections/DataPackage',
        'models/metadata/eml211/EML211',
        'models/metadata/ScienceMetadata',
        'views/metadata/EML211View',
        'views/DataPackageView',
        'views/SignInView',
        'text!templates/editor.html'], 
        function(_, $, Backbone, DataPackage, EML, ScienceMetadata, EMLView, DataPackageView, SignInView,
        		EditorTemplate){
    
    var EditorView = Backbone.View.extend({
                
        el: "#Content",
        
        /* The initial editor layout */
        template: _.template(EditorTemplate),
        
        /* Events that apply to the entire editor */
        events: {
        	"click .cancel"      : "cancel",
        	"click #save-editor" : "save"
        },
        
        /* The identifier of the root package EML being rendered */
        pid: null,

        /* A list of the subviews of the editor */
        subviews: [],
        
        /* The data package view */
        dataPackageView: null,
        
        /* Initialize a new EditorView - called post constructor */
        initialize: function(options) {

            return this;
        },
        
        //Create a new EML model for this view        
        createModel: function(){
        	//If no pid is given, create a new EML model
        	if(!this.pid)
        		var model = new EML();
        	//Otherwise create a generic metadata model until we find out the formatId
        	else
        		var model = new ScienceMetadata({ id: this.pid });
            
            // Once the ScienceMetadata is populated, populate the associated package
            this.model = model;

        },
        
        /* Render the view */
        render: function() {

            MetacatUI.appModel.set('headerType', 'default');
            
        	//Inert the basic template on the page
        	this.$el.html(this.template({
        		loading: MetacatUI.appView.loadingTemplate({ msg: "Loading editor..."})
        	}));
        	
        	//If we don't have a model at this point, create one
        	if(!this.model) this.createModel();
        		
	        //When the basic Solr metadata are retrieved, get the associated package
	        this.listenToOnce(this.model, "sync", this.getDataPackage);
	        //If no object is found with this ID, then tell the user
	        this.listenToOnce(this.model, "change:notFound", this.showNotFound);
	        	
            //If the user is logged in, fetch the Metadata
        	if(MetacatUI.appUserModel.get("loggedIn")) {
        		if(!this.pid) 
        			this.model.trigger("sync");
        		else 
        			this.model.fetch();
    		}
        	//If we checked for authentication and the user is not logged in
        	else if(MetacatUI.appUserModel.get("checked")){
        		this.showSignIn();
        	}
        	//If we haven't checked for authentication yet
        	else {   
        		//Wait until the user info is loaded before we request the Metadata
	            this.listenToOnce(MetacatUI.appUserModel, "change:checked", function(){
	            	if(!MetacatUI.appUserModel.get("loggedIn")){
	            		this.showSignIn();
	            		return;
	            	}
	            		
	            	if(!this.pid) 
	        			this.model.trigger("sync");
	        		else 
	        			this.model.fetch();
	            });
    		}
                        
            return this;
        },
        
        /* Get the data package associated with the EML */
        getDataPackage: function(scimetaModel) {
            console.log("EditorView.getDataPackage() called.");
            
            if(!scimetaModel)
            	var scimetaModel = this.model;
            
            var resourceMapIds = scimetaModel.get("resourceMap");
            
            if ( resourceMapIds === "undefined" || resourceMapIds === null || resourceMapIds.length <= 0 ) {
                console.log("Resource map ids could not be found for " + scimetaModel.id);
                
                // Create a fresh package
                MetacatUI.rootDataPackage = new DataPackage([this.model]);
                this.renderMetadata(this.model);
                
            } else {
                
                // Create a new data package with this id
                MetacatUI.rootDataPackage = new DataPackage([this.model], { id: resourceMapIds[0] });
                
                var view = this;
                // As the root collection is updated with models, render the UI
                this.listenTo(MetacatUI.rootDataPackage, "add", function(model){
                	
                	if(!model.get("synced") && model.get('id'))
                		this.listenTo(model, "sync", view.renderMember);
                	else if(model.get("synced"))
                		view.renderMember(model);
                	
                	//Listen for changes on this member
                	this.listenTo(model, "change:uploadStatus", view.showControls);

                });

                // Render the package table framework
                this.dataPackageView = new DataPackageView({
                	edit: true,
                	dataPackage: MetacatUI.rootDataPackage
                	});
                var $packageTableContainer = this.$("#data-package-container");
                $packageTableContainer.html(this.dataPackageView.render().el);
                this.subviews.push(this.dataPackageView);
                
                //Fetch the data package
                MetacatUI.rootDataPackage.fetch();
                
                this.listenTo(MetacatUI.rootDataPackage.packageModel, "change:childPackages", this.renderChildren)
            }

            this.listenTo(MetacatUI.rootDataPackage, "errorSaving", this.errorSaving);
        },
        
        renderChildren: function(model, options) {
            console.log("EditorView.renderChildren() called.");
            console.log(model);
            console.log(options);
            
        },
        
        /* Calls the appropriate render method depending on the model type */
        renderMember: function(model, collection, options) {
            
            // Render metadata or package information, based on the type
            
            if ( typeof model.attributes === "undefined") {
                return;
                
            } else {
                switch ( model.get("type")) {
                    case "DataPackage":
                        // Do recursive rendering here for sub packages
                        break;
                        
                    case "Metadata":
                        
                        // this.renderDataPackageItem(model, collection, options);
                        this.renderMetadata(model, collection, options);
                        break;
                        
                    case "Data":
                        //this.renderDataPackageItem(model, collection, options);
                        break;
                    
                    default:
                        console.log("model.type is not set correctly");
                    	
                }
            }            
        },
        
        /* Renders the metadata section of the EditorView */
        renderMetadata: function(model, collection, options){
            
            var emlView, dataPackageView;

            // render metadata as the collection is updated, but only EML passed from the event
            if ( typeof model.get === "undefined" || 
                        model.get("formatId") !== "eml://ecoinformatics.org/eml-2.1.1" ) {
                console.log("Not EML. TODO: Render generic ScienceMetadata.");
                return;
                
            } else {
            	console.log("Rendering EML Model ", model);
            	               
            	//Style the body as an Editor
                $("body").addClass("Editor");
            	
            	//Create an EML model
                if(model.type != "EML")
                	model = new EML(model.toJSON());
        	
            	//Create an EML211 View and render it
            	emlView = new EMLView({ 
            		model: model,
            		edit: true
            		});
            	this.subviews.push(emlView);
            	emlView.render();
                // this.renderDataPackageItem(model, collection, options);
               // this.off("change", this.renderMember, model); // avoid double renderings      	
                
            }
        },
        
        /* Renders the data package section of the EditorView */
        renderDataPackageItem: function(model, collection, options) {
                        
            var hasPackageSubView = 
                _.find(this.subviews, function(subview) {
                    return subview.id === "data-package-table";
                }, model);
            
            // Only create the package table if it hasn't been created            
            if ( ! hasPackageSubView ) {
                this.dataPackageView = new DataPackageView({
                    dataPackage: MetacatUI.rootDataPackage,
                    edit: true
                    });
                this.subviews.push(this.dataPackageView);
                dataPackageView.render();
                
            }
        },
        
        /*
         * Saves all edits in the collection
         */
        save: function(e){
        	var btn = (e && e.target)? $(e.target) : this.$("#save-editor");
        	
        	//If the save button is disabled, then we don't want to save right now
        	if(btn.is(".btn-disabled")) return;
        	
        	//Change the style of the save button
        	btn.html('<i class="icon icon-spinner icon-spin"></i> Saving...').addClass("btn-disabled");
        	        	
        	//When the package is saved, revert the button back to normal
        	this.listenToOnce(MetacatUI.rootDataPackage, "sync", function(){
        		btn.html("Save").removeClass("btn-disabled");
        		this.hideControls();
        	});
        	
        	//Save the package!
        	MetacatUI.rootDataPackage.save();
        },
        
        /*
         * When the data package collection fails to save, tell the user
         */
        errorSaving: function(errorMsg){
        	var errorId = "error" + Math.round(Math.random()*100),
        		message = $(document.createElement("div")).append("<p>Not all of your changes could be saved.</p>");
        	
        	message.append($(document.createElement("a"))
        						.text("See details")
        						.attr("data-toggle", "collapse")
        						.attr("data-target", "#" + errorId)
        						.addClass("pointer"),
        					$(document.createElement("div"))
        						.addClass("collapse")
        						.attr("id", errorId)
        						.append($(document.createElement("pre")).text(errorMsg)));

        	MetacatUI.appView.showAlert(message, "alert-error", this.$el, null, { emailBody: "Error message: Data Package save error: " + errorMsg });
        },
        
        /*
         * Called when there is no object found with this ID
         */
        showNotFound: function(){
			//If we haven't checked the logged-in status of the user yet, wait a bit until we show a 404 msg, in case this content is their private content
			if(!MetacatUI.appUserModel.get("checked")){
				this.listenToOnce(MetacatUI.appUserModel, "change:checked", this.showNotFound);
				return;
			}
			//If the user is not logged in
			else if(!MetacatUI.appUserModel.get("loggedIn")){
				this.showSignIn();
				return;
			}

			if(!this.model.get("notFound")) return;

			var msg = "<h4>Nothing was found for one of the following reasons:</h4>" +
			  "<ul class='indent'>" +
			  	  "<li>The ID '" + this.pid  + "' does not exist.</li>" +
				  '<li>This may be private content. (Are you <a href="#signin">signed in?</a>)</li>' +
				  "<li>The content was removed because it was invalid.</li>" +
			  "</ul>";
			this.hideLoading();
			MetacatUI.appView.showAlert(msg, "alert-error", this.$el);
			
		},
		
		showSignIn: function(){
    		var container = $(document.createElement("div")).addClass("container center");
    		this.$el.html(container);
    		var signInButtons = new SignInView().render().el;
    		$(container).append('<h1>Sign in to submit data</h1>', signInButtons);
		},
        
        /*
         * Cancel all edits in the editor
         */
        cancel: function(){
        	this.render();
        },
        
	    showControls: function(model){
	    	if(model.get("uploadStatus") == "q")
	    		this.$(".editor-controls").slideDown();
	    },
	    
	    hideControls: function(){
	    	this.$(".editor-controls").slideUp();
	    },
	    
	    showLoading: function(container, message){
	    	if(typeof container == "undefined" || !container)
	    		var container = this.$el;
	    	
	    	$(container).html(MetacatUI.appView.loadingTemplate({ msg: message }));
	    },
              
	    hideLoading: function(container){
	    	if(typeof container == "undefined" || !container)
	    		var container = this.$el;
	    	
	    	$(container).find(".loading").remove();
	    },
	    
        /* Close the view and its sub views */
        onClose: function() {
            this.off();    // remove callbacks, prevent zombies         
			
            $(".Editor").removeClass("Editor");
            
            this.model = null;
            this.pid = null;
            
            // Close each subview
            _.each(this.subviews, function(i, subview) {
				if(subview.onClose)
					subview.onClose();
            });
            
            this.subviews = [];
			window.onbeforeunload = null;
            
        }
                
    });
    return EditorView;
});