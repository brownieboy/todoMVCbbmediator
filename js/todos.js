// An example Backbone application contributed by
// [Jérôme Gravel-Niquet](http://jgn.me/). This demo uses a simple
// [LocalStorage adapter](backbone-localstorage.js)
// to persist Backbone models within your browser.


// MB - Set up the global that will store the list of subscriptions (topics).
var myUtils = myUtils || {};
myUtils.topics = myUtils.topics || {};

// MB - the key function that sets up the pub/sub.  It uses the new jQuery.CallBacks(),
// which requires jQuery 1.7 or higher.  Function lovingly lifted from the jQuery
// documentation at http://api.jquery.com/jQuery.Callbacks - see the section
// "$.Callbacks, $.Deferred and Pub/Sub" near the bottom of that page.
// I've modified it slightly so you can override the default topics list in the
// function call if you want.  Use the optional topicsQueue parameter for that.
jQuery.Topic = function(id, topicsQueue) {
	var topics = topicsQueue || myUtils.topics;
	// Parameters are passed by reference, so itÏ
	// will update whatever topicsQueue that's passed in.
	var callbacks, method, topic = id && topics[id];
	if (!topic) {
		callbacks = jQuery.Callbacks();
		topic = {
			publish : callbacks.fire,
			subscribe : callbacks.add,
			unsubscribe : callbacks.remove
		};
		if (id) {
			topics[id] = topic;
		}
	}
	return topic;
};


// MB - New View to set up our two on-screen consoles, which will be
// our observers.
OnScreenConsoleView = Backbone.View.extend({
	initialize : function() {
		_.bindAll(this, 'updateConsoleItemToggle',
				'updateConsoleAllCompleteToggle');
	},
	updateConsoleItemToggle : function(parameterObj) {
		// parameterObj is set by the corresponding .publish() call(s)
		this.$el.html("Item '" + parameterObj.attributes.content
				+ "' toggled " + !parameterObj.attributes.done
				+ (new Date().toLocaleTimeString()) + "<br>" + this.$el.html());
	},
	updateConsoleAllCompleteToggle : function(parameterObj) {
		// parameterObj is set by the corresponding .publish() call(s)
		this.$el.html("All items complete toggled to "
				+ (parameterObj.checked ? "on" : "off") + " at "
				+ (new Date().toLocaleTimeString()) + "<br>" + this.$el.html());
	}
});

// Load the application once the DOM is ready, using `jQuery.ready`:
$(function() {

			// Todo Model
			// ----------

			// Our basic **Todo** model has `content`, `order`, and `done`
			// attributes.
			var Todo = Backbone.Model.extend({

						// Default attributes for the todo.
						defaults : {
							content : "empty todo...",
							done : false
						},

						// Ensure that each todo created has `content`.
						initialize : function() {
							if (!this.get("content")) {
								this.set({
											"content" : this.defaults.content
										});
							}
						},

						// Toggle the `done` state of this todo item.
						toggle : function() {
							this.save({
										done : !this.get("done")
									});
						},

						// Remove this Todo from *localStorage* and delete its
						// view.
						clear : function() {
							this.destroy();
						}
					});

			// Todo Collection
			// ---------------

			// The collection of todos is backed by *localStorage* instead of a
			// remote
			// server.
			var TodoList = Backbone.Collection.extend({

						// Reference to this collection's model.
						model : Todo,

						// Save all of the todo items under the `"todos"`
						// namespace.
						localStorage : new Store("todos-backbone"),

						// Filter down the list of all todo items that are
						// finished.
						done : function() {
							return this.filter(function(todo) {
										return todo.get('done');
									});
						},

						// Filter down the list to only todo items that are
						// still not finished.
						remaining : function() {
							return this.without.apply(this, this.done());
						},

						// We keep the Todos in sequential order, despite being
						// saved by unordered
						// GUID in the database. This generates the next order
						// number for new items.
						nextOrder : function() {
							if (!this.length)
								return 1;
							return this.last().get('order') + 1;
						},

						// Todos are sorted by their original insertion order.
						comparator : function(todo) {
							return todo.get('order');
						}
					});

			// Create our global collection of **Todos**.
			var Todos = new TodoList;

			// Todo Item View
			// --------------

			// The DOM element for a todo item...
			var TodoView = Backbone.View.extend({

						// ... is a list tag.
						tagName : "li",

						// Cache the template function for a single item.
						template : _.template($('#item-template').html()),

						// The DOM events specific to an item.
						events : {
							"click .check" : "toggleDone",
							"dblclick label.todo-content" : "edit",
							"click span.todo-destroy" : "clear",
							"keypress .todo-input" : "updateOnEnter",
							"blur .todo-input" : "close"
						},

						// The TodoView listens for changes to its model,
						// re-rendering. Since there's
						// a one-to-one correspondence between a **Todo** and a
						// **TodoView** in this
						// app, we set a direct reference on the model for
						// convenience.
						initialize : function() {
							_.bindAll(this, 'render', 'close', 'remove');
							this.model.bind('change', this.render);
							this.model.bind('destroy', this.remove);
						},

						// Re-render the contents of the todo item.
						render : function() {
							$(this.el).html(this.template(this.model.toJSON()));
							this.input = this.$('.todo-input');
							return this;
						},

						// Toggle the `"done"` state of the model.
						toggleDone : function() {
							this.model.toggle();
						// MB - We've done the biz on our model (previous line) now do a general
						// publish to any other observers.  I'm passing back only the model
						// attributes (i.e. the data) to the observer, wrapped in an object.  You
						// can pass back the whole model if you like, or only individual attribute(s)
						// It all depends on what your observer(s) require, and where you want your
						// logic: here or in the observer?
							$.Topic("toggleItemDone").publish({
										attributes : this.model.attributes
									});
						},

						// Switch this view into `"editing"` mode, displaying
						// the input field.
						edit : function() {
							$(this.el).addClass("editing");
							this.input.focus();
						},

						// Close the `"editing"` mode, saving changes to the
						// todo.
						close : function() {
							this.model.save({
										content : this.input.val()
									});
							$(this.el).removeClass("editing");
						},

						// If you hit `enter`, we're through editing the item.
						updateOnEnter : function(e) {
							if (e.keyCode == 13)
								this.close();
						},

						// Remove the item, destroy the model.
						clear : function() {
							this.model.clear();
						}
					});

			// The Application
			// ---------------

			// Our overall **AppView** is the top-level piece of UI.
			var AppView = Backbone.View.extend({

						// Instead of generating a new element, bind to the
						// existing skeleton of
						// the App already present in the HTML.
						el : $("#todoapp"),

						// Our template for the line of statistics at the bottom
						// of the app.
						statsTemplate : _.template($('#stats-template').html()),

						// Delegated events for creating new items, and clearing
						// completed ones.
						events : {
							"keypress #new-todo" : "createOnEnter",
							"keyup #new-todo" : "showTooltip",
							"click .todo-clear a" : "clearCompleted",
							"click .mark-all-done" : "toggleAllComplete"
						},

						// At initialization we bind to the relevant events on
						// the `Todos`
						// collection, when items are added or changed. Kick
						// things off by
						// loading any preexisting todos that might be saved in
						// *localStorage*.
						initialize : function() {
							_.bindAll(this, 'addOne', 'addAll', 'render',
									'toggleAllComplete');

							this.input = this.$("#new-todo");
							this.allCheckbox = this.$(".mark-all-done")[0];

							Todos.bind('add', this.addOne);
							Todos.bind('reset', this.addAll);
							Todos.bind('all', this.render);

							Todos.fetch();
						},

						// Re-rendering the App just means refreshing the
						// statistics -- the rest
						// of the app doesn't change.
						render : function() {
							var done = Todos.done().length;
							var remaining = Todos.remaining().length;

							this.$('#todo-stats').html(this.statsTemplate({
										total : Todos.length,
										done : done,
										remaining : remaining
									}));

							this.allCheckbox.checked = !remaining;
						},

						// Add a single todo item to the list by creating a view
						// for it, and
						// appending its element to the `<ul>`.
						addOne : function(todo) {
							var view = new TodoView({
										model : todo
									});
							this.$("#todo-list").append(view.render().el);
						},

						// Add all items in the **Todos** collection at once.
						addAll : function() {
							Todos.each(this.addOne);
						},

						// Generate the attributes for a new Todo item.
						newAttributes : function() {
							return {
								content : this.input.val(),
								order : Todos.nextOrder(),
								done : false
							};
						},

						// If you hit return in the main input field, create new
						// **Todo** model,
						// persisting it to *localStorage*.
						createOnEnter : function(e) {
							if (e.keyCode != 13)
								return;
							Todos.create(this.newAttributes());
							this.input.val('');
						},

						// Clear all done todo items, destroying their models.
						clearCompleted : function() {
							_.each(Todos.done(), function(todo) {
										todo.clear();
									});
							return false;
						},

						// Lazily show the tooltip that tells you to press
						// `enter` to save
						// a new todo item, after one second.
						showTooltip : function(e) {
							var tooltip = this.$(".ui-tooltip-top");
							var val = this.input.val();
							tooltip.fadeOut();
							if (this.tooltipTimeout)
								clearTimeout(this.tooltipTimeout);
							if (val == ''
									|| val == this.input.attr('placeholder'))
								return;
							var show = function() {
								tooltip.show().fadeIn();
							};
							this.tooltipTimeout = _.delay(show, 1000);
						},

						toggleAllComplete : function() {
							var done = this.allCheckbox.checked;
							Todos.each(function(todo) {
										todo.save({
													'done' : done
												});
									});
						// MB - Publish that the "Mark all completed" checkbox has been toggled.
						// This time, we're only passing back the invidual data point, i.e. the
						// checkbox's current value, to the observer.  Again, it's wrapp in an
						// object.
							$.Topic("toggleAllCompleteClicked").publish({
										checked : this.allCheckbox.checked
									});
							$
						}
					});

			// Finally, we kick things off by creating the **App**.
			var App = new AppView;
			
			// MB - Set up the two on-screen console views.  These are our
			// observers so we also set up subscriptions to the subjects in
			// which they are interested: two for the first console, and one
			// for the second.
			var onScreenConsoleView = new OnScreenConsoleView({
						el : $("#onScreenConsole")
					});
			// onScreenConsoleView registers when any checkbox is clicked.		
			$.Topic("toggleItemDone")
				.subscribe(onScreenConsoleView.updateConsoleItemToggle);
			$.Topic("toggleAllCompleteClicked")
				.subscribe(onScreenConsoleView.updateConsoleAllCompleteToggle);

			var onScreenConsoleView2 = new OnScreenConsoleView({
						el : $("#onScreenConsole2")
					});
			// onScreenConsoleView2 registers only when Mark all as complete checkbox is clicked. 		
			$.Topic("toggleAllCompleteClicked")
					.subscribe(onScreenConsoleView2.updateConsoleAllCompleteToggle);
		});
