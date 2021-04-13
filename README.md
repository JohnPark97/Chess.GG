# CPSC 436V Project


*Code and file structure explanation*

- The structure of our final project is very similar to the code structure used in the assignments. 
- In index.html, we use a div with an id to create containers for each of the views (except the chessboard).
  This div includes a h1 tag and a svg tag which then allows us to use CSS in order to create a title/border for each of the views.
  Hence, this allows us to easily create frames for every view without having to write duplicate code in each of the javascript files!
- In main.js, we include the logic for instantiating the classes, handling the dispatcher and also, we currently 
  handle all the logic for manipulating the chess board visualization. After the loadInteractions() and loadViews()
  function calls, there is a comment stating that the rest of the functions in this file are used for the chessboard.
- For each of our views (except the chessboard), we have a javascript file that holds the class implementation. 
  These scripts are linked at the bottom of the index file and have init(), updateVis() and renderVis() functions.
- Special note to point out that the chessboard is created using html only without d3/other libraries. This is why in
index.html, there is a large chunk of section at the bottom creating the html structure for the chessboard. Maybe this
could be extracted in the future but for now, we have not touched it.  
- Lastly, the csv file and the css files are in their respective folders.

*Reference and source any external material here*

These links helped us with implementing the chess board for the final view in our visualization:
- https://stackoverflow.com/questions/26432492/chessboard-html5-only
- https://codepen.io/PegasusDev/pen/eZZYdY

When I was searching up resources for sankey diagrams in d3, I noticed that it was very common for people to simply
include a plugin and go from there. I believe that we are not allowed to simply install/include a plugin, so I looked
around for other resources. I ended up finding this resource that gave me a good start but in some places,
the code/d3 calls were outdated, so I had to spend quite a lot of time in order to create the node/links logic
for the sankey diagram. Then I worked hard to append the appropriate marks for the sankey diagram:
- https://bl.ocks.org/d3noob/06e72deea99e7b4859841f305f63ba85

*Extra Information*
- When the user first accesses Chess.gg, it will some time for it to load because currently, the default is to load
all the openings. Please be patient for this milestone!