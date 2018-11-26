define(["jquery",
    "underscore",
    "backbone",
    "text!templates/project/projectMembers.html",
    "views/project/ProjectSectionView"], 
    function($, _, Backbone, ProjectMembersTemplate, ProjectSectionView){

    /* The ProjectMembersView is a view to render the
     * project members tab (within ProjectSectionView) 
     */
     var ProjectMembersView = ProjectSectionView.extend({

      /* Tab label and section name */
      tabInfo: {
         // title displayed on tab in ui
         tab_title: "People", 
         // value of data-section and data-target id
         section_name: "project-members", 
         // should the tab be active when first loaded
         active_by_default: false,
     },
      //   /* The Project Members Element*/
      //   el: "#project-members",

      //   /* TODO: Decide if we need this */
      //   type: "ProjectMembers",

      //   /* The list of subview instances contained in this view*/
      //   subviews: [], // Could be a literal object {}

      //   /* Renders the compiled template into HTML */
      //   template: _.template(ProjectMembersTemplate),

      //   /* The events that this view listens to*/
      //   events: {

      //   },

      //   /* Construct a new instance of ProjectMembersView */
      //   initialize: function() {

      //   },

      //   /* Render the view */
      //   render: function() {

      //   },

      //   onClose: function() {

      //   }

     });

     return ProjectMembersView;
});