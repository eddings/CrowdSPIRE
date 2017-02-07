/**
 * CrowdSPIRE: Main function for Workspace
 * More function will be added sooner.
 */

const svg = d3.select('#vis');
const WIDTH = parseInt(svg.style("width"), 10);
const HEIGHT = parseInt(svg.style("height"), 10);
const DocWidth = 250;
const DocHeight = 300;
const DocRadius = Math.sqrt(DocWidth * DocWidth + DocHeight * DocHeight) / 2.00;
const DocSide = 40;
const IconSide = 10;
const ResizingRectSide = 10;
const DocR = 6;
const IconR = 3;
const entityColor = {
    "Person": "#d9b8f1",
    "Location": "#BDC03F",
    "Organization": "#ffe543",
    "Money": "#FF9B14",
    "Misc": "#F69AC1",
    "Phone": "#8EB4FF",
    "Interesting": "#f1f1b8",
    "Date": "#67E1D8"
};

var forceCollide = d3.forceCollide()
    .radius(function (d) {
        return d.radius;
    })
    .iterations(2)
    .strength(0.95);

var simulation = d3.forceSimulation()
    .force("link", d3.forceLink().id(function (d) {
        return d.id;
    }))
    .force("charge", d3.forceManyBody().strength(-360))
    .force("center", d3.forceCenter(WIDTH / 2, HEIGHT / 2))
    .force("collide", forceCollide);

var q = d3.queue();
q.defer(d3.json, 'data/crescent.json');
q.await(workspace);

// draw the workspace with docs
function workspace(error, docs) {

    var clickedDoc = null;

    if (error) {
        throw error;
    }

    simulation.nodes(docs.nodes)
        .on("tick", ticked);

    simulation.force("link")
        .links(docs.links)
        .strength(function (link) {
            return link.similarity;
        });

    var linkG = svg.append('g');
    var link = null;

    var node = svg.selectAll(".node")
        .data(docs.nodes)
        .enter().append("g")
        .attr("class", "node")
        .attr("cursor", "move")
        .on("mousedown", function () {
            d3.event.preventDefault();
        })
        .on('click', nodeClicked)
        .on('dblclick', nodeDoubleClicked)
        .call(d3.drag()
            .on("start", nodeDragStarted)
            .on("drag", nodeDragged)
            .on("end", nodeDragEnded));

    // label
    node.append("text")
        .attr("dx", 12)
        .attr("dy", ".35em")
        .text(function (d) {
            return d.id
        });

    // rectangle
    node.append("rect")
        .attr("width", function (d) {
            d.radius = IconSide / Math.sqrt(2.00);
            d.width = IconSide;
            return IconSide;
        })
        .attr("height", function (d) {
            d.height = IconSide;
            return IconSide;
        })
        .attr("x", function (d) {
            return d.width;
        })
        .attr("y", function (d) {
            return d.height;
        })
        .attr("fill", function (d) {
            return 'steelblue';
        })
        .attr('rx', function (d) {
            return IconR;
        })
        .attr('ry', function (d) {
            return IconR;
        })
        .attr('class', 'IconRect');

    svg.on('mousedown', unfixNodes);

    // ticked
    function ticked() {

        // Not change the width and height of each node.
        node.attr("transform", function (d) {

            // border constriction
            d.x = Math.max(d.width / 2, Math.min(WIDTH - d.width / 2, d.x));
            d.y = Math.max(d.height / 2, Math.min(HEIGHT - d.height / 2, d.y));

            // Update the group position: which include the basic rectangle and Foreign object. (Drag Object too...)
            return "translate(" + d.x + "," + d.y + ")";
        });


        // rectangle: keep ICON rectangle at the center of Node Group
        node.selectAll("rect")
            .attr("x", function (d) {
                return -d.width / 2;
            })
            .attr("y", function (d) {
                return -d.height / 2;
            });


        // When a node is selected(highlighted), related nodes/links should highlighted to.
        if (clickedDoc != null) {

            // Show labels on each related link
            link.selectAll('text')
                .attr('x', function (d) {
                    return (d.source.x + d.target.x) / 2;
                })
                .attr('y', function (d) {
                    return (d.source.y + d.target.y) / 2;
                })
                .attr('transform', function (d, i) {

                    var dx = 0, dy = 0;
                    if (d.target.x > d.source.x) {
                        dx = d.target.x - d.source.x;
                        dy = d.target.y - d.source.y;
                    } else {
                        dx = d.source.x - d.target.x;
                        dy = d.source.y - d.target.y;
                    }

                    var angle = Math.atan2(dy, dx) * 180 / Math.PI;
                    var bbox = this.getBBox();
                    var rx = bbox.x + bbox.width / 2;
                    var ry = bbox.y + bbox.height / 2;
                    return 'rotate(' + angle + ' ' + rx + ' ' + ry + ')';
                });

            // Show line between each related link
            link.selectAll('line')
                .attr('x1', function (d) {
                    return d.source.x;
                })
                .attr('y1', function (d) {
                    return d.source.y;
                })
                .attr('x2', function (d) {
                    return d.target.x;
                })
                .attr('y2', function (d) {
                    return d.target.y;
                });
        }
    }


    function nodeClicked(d) {

        if (clickedDoc != d.id) {
            unfixNodes();

            d.fx = d.x;
            d.fy = d.y;
            clickedDoc = d.id;

            updateLinks();
        }
    }

    function nodeDoubleClicked(d) {

        if (d.visualDetailLevel != 'Document') {
            d.visualDetailLevel = "Document";
            updateRectangles(d);
        }
        if (clickedDoc != d.id) {
            unfixNodes();

            d.fx = d.x;
            d.fy = d.y;
            clickedDoc = d.id;
            updateLinks();
        }
    }

    function nodeDragStarted(d) {
        if (!d3.event.active) {
            simulation.alphaTarget(0.3).restart();
        }

        if (clickedDoc != d.id) {
            unfixNodes();
            d.fx = d.x;
            d.fy = d.y;
            clickedDoc = d.id;
            updateLinks();
        }
    }

    // During node drag.
    function nodeDragged(d) {
        d.fx = d3.event.x;
        d.fy = d3.event.y;
    }

    // the end of node drag.
    function nodeDragEnded(d) {
        if (!d3.event.active) {
            simulation.alphaTarget(0);
        }
        forceCollide.initialize(simulation.nodes());
    }


    // Icon-Level Node -> Document-Level Node:
    //      When a Icon-Level node double clicked, enlarge the size of background rectangle, and add foreign object to show contents of this node.

    // Document-Level Node -> Icon-Level Node:
    //      When the close button is clicked on this Document-Level Node, smaller the size of background rectangle, and delete the foreign object.

    // Delete Node:
    //      When the delete button is clicked on Document-Level Node, the background rectangle and foreign object of this node group would be deleted from the screen.
    function updateRectangles(selectedDoc) {

        // Improve efficiency using node.filter (May be better)
        var docLevelNode = node.filter(function (d) {
            return d.id == selectedDoc.id;
        });

        docLevelNode.select('rect')
            .attr("width", function (d) {
                // Changes based on d. text: each document have different length of Text
                // Using Golden Ratio give the document level node a good looking rectangle.
                var c = 90;
                var a = 69;
                var goldenRatio = 1.618;
                return d.width = (a + Math.sqrt(a*a+4*goldenRatio*c*d.text.length))/(2*goldenRatio);
            })
            .attr("height", function (d) {
                return d.height = 1.61803398875 * d.width;
            })
            .attr("x", function (d) {
                // Radius is used for collision detection.
                d.radius = Math.sqrt(d.width*d.width + d.height*d.height)/2;
                return -d.width / 2;
            })
            .attr("y", function (d) {
                return -d.height;
            })
            .attr('rx', function (d) {
                return DocR;
            })
            .attr('ry', function (d) {
                return DocR;
            })
            .attr('class', function (d) {
                return 'DocRect';
            });

        //Add document content into docNode(Document Level Node)
        var docContent = docLevelNode.append("foreignObject")
            .attr("class", "doc")
            .attr("width", function (d) {
                return d.width;
            })
            .attr("height", function (d) {
                return d.height -40;
            })
            .attr("x", function (d) {
                return -d.width / 2;
            })
            .attr("y", function (d) {
                return -d.height / 2 + 20;
            })
            .append("xhtml:body")
            .style("margin", 0)
            .style("padding", 0)
            .append("div")
            .style("max-height", function (d) {
                return d.height - 40 + 'px';
            })
            .style("height", function (d) {
                return d.height - 40 + 'px';
            });

        docContent.append('p')
            .attr('class', 'doc-title')
            .text(function (d) {
                return d.id;
            });

        docContent.append('p')
            .attr('class', 'doc-content')
            .attr('height', function (d) {
                return d.height - 50 + 'px';
            })
            .text(function (d) {
                return d.text;
            });


        forceCollide.initialize(simulation.nodes());
    }


    function updateLinks() {

        link = linkG.selectAll(".link")
            .data(docs.links.filter(linkFilter))
            .enter().append("g")
            .attr("class", "link")
            .attr("source", function (d) {
                return d.source.id;
            })
            .attr("target", function (d) {
                return d.target.id;
            });

        link.append('line')
        // .attr('stroke', '#ccc')
        // .attr('stroke-width', 1)
        // .attr('opacity', 0.6);

        entity = link.append('text')
            .attr('font-size', "10px")
            .attr("text-anchor", "middle")
            .text(function (d) {
                var str = '';
                for (var i in d.entities) {
                    if (i == 0) {
                        str += d.entities[i];
                    } else {
                        str = str + ', ' + d.entities[i];
                    }
                }
                return str;
            })
            .attr('stroke', '#aaa');

    }

    function linkFilter(d) {
        return ((d.source.id == clickedDoc) || (d.target.id == clickedDoc)) && (d.source.id != d.target.id) && (d.similarity > 0.01);
    }

    function unfixNodes() {
        docs.nodes.forEach(function (d) {
            if (d.visualDetailLevel != 'Document') {
                d.fx = null;
                d.fy = null;
            }
        });

        clickedDoc = null;
        if (link != null) {
            link.remove();
        }
    }
}

