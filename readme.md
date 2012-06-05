This is an attempt to add some extra pub/sub functionality to a backbone.js app by using jQuery.Callbacks() as a mediator.  This gives you a way of alerting other observers in your app, outside of the tight binding between your backbone.js views and models.

I've taken Addy Osmani's standard backbone.js todoMVC application from http://addyosmani.github.com/todomvc/ and added the jQuery.Topics() utility function to it. (The jQuery documentation at http://api.jquery.com/jQuery.Callbacks explains how it works - see the section "$.Callbacks, $.Deferred and Pub/Sub" near the bottom of that doco page.)

There are two new div consoles, unimaginativly called "Console 1" and "Console 2" at the bottom of the screen.  I've set up two instances of a new View called OnScreenConsoleView as views for these consoles.  Each one of the two instances subscribes to different events.  The view for "Console 1", called onScreenConsoleView, will register when any of the checkboxes are clicked.  The view for "Console 2" will register only when the "Mark all as Completed" checkbox is ticked.  
 


