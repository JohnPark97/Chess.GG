class Sankey {

    constructor(_config, _data, _dispatcher) {
        this.config = {
            parentElement: _config.parentElement,
            containerWidth: _config.containerWidth || 1500,
            containerHeight: _config.containerHeight || 800,
            tooltipPadding: _config.tooltipPadding || 15,
            margin: {top: 50, right: 20, bottom: 55, left: 60}
        }
        this.data = _data;
        this.dispatcher = _dispatcher;
        this.initVis();
    }

    initVis() {
        let vis = this;

        // Set width and height with margins
        vis.width = vis.config.containerWidth - vis.config.margin.left - vis.config.margin.right;
        vis.height = vis.config.containerHeight - vis.config.margin.top - vis.config.margin.bottom;

        // Append svg and chart
        vis.svg = d3.select(vis.config.parentElement)
            .attr('width', vis.config.containerWidth)
            .attr('height', vis.config.containerHeight);

        vis.chart = vis.svg.append('g')
            .attr('transform', `translate(${vis.config.margin.left},${vis.config.margin.top})`)

        vis.updateVis();
        vis.renderLegend();
    }

    updateVis() {
        let vis = this;

        // Construct sankey node and links data or reset sankey data
        vis.sankey = vis.create_sankey()
            .nodeWidth(40)
            .nodePadding(30)
            .size([vis.width, vis.height]);

        // If there are more than 10 selected openings, we will only show up to 10 openings
        let groupedData = d3.group(vis.data, d => d.opening_name);
        if(groupedData.size > 10) {
            let topTenOpenings = Array.from(groupedData.keys()).slice(0, 10);
            vis.testData = vis.data.filter(d => topTenOpenings.includes(d.opening_name));
        } else {
            vis.testData = vis.data;
        }

        // Manipulate data into source, target and value format
        vis.sankeyData = d3.group(vis.testData, d => d.skill_level);
        vis.path = vis.sankey.link();

        // Set up graph in same style as original example but empty
        vis.graph = {"nodes": [], "links": []};

        // Get opening names, skill categories and victory status' for colour channels
        let opening_names = vis.testData.map(d => d.opening_name);
        let skill_levels = vis.testData.map(d => d.skill_level);
        let victory_status = vis.testData.map(d => d.victory_status);
        // Filter into unique values
        vis.unique_openings_set = new Set(opening_names);
        vis.unique_skill_levels_set = new Set(skill_levels);
        vis.unique_victory_status_set = new Set(victory_status);

        // Create colour categories, CAN ONLY HANDLE 10 COLOURS FOR NOW
        vis.openingsColorPalette = d3.scaleOrdinal(d3.schemeCategory10);
        vis.skillLevelsColorPalette = d3.scaleOrdinal(d3.schemeCategory10);
        vis.victoryStatusColorPalette = d3.scaleOrdinal(d3.schemeCategory10);
        vis.openingsColorPalette.domain(vis.unique_openings_set);
        vis.skillLevelsColorPalette.domain(vis.unique_skill_levels_set);
        vis.victoryStatusColorPalette.domain(vis.unique_victory_status_set);

        // Push opening names into nodes (Column A)
        for (let opening of vis.unique_openings_set) {
            vis.graph.nodes.push(opening);
        }

        // Push other nodes and links
        for (let [skilLevelKey, skilLevelValue] of vis.sankeyData) {
            // Push skill level names into nodes (Column B)
            vis.graph.nodes.push(skilLevelKey);

            // Push links from Column A -> Column B
            let openingFrequencyForSkillCategory = d3.group(skilLevelValue, d => d.opening_name);
            for (let [openingNameKey, openingNameValue] of openingFrequencyForSkillCategory) {
                vis.graph.links.push({
                    "source": openingNameKey,
                    "target": skilLevelKey,
                    "value": openingNameValue.length
                });
            }

            let victoryStatusData = d3.group(skilLevelValue, d => d.victory_status);
            for (let [victoryStatusKey, victoryStatusValue] of victoryStatusData) {
                // Push victory status names into nodes if it does not already exist (Column C)
                if (vis.graph.nodes.indexOf(victoryStatusKey) === -1) {
                    vis.graph.nodes.push(victoryStatusKey);
                }

                // Push links from Column B -> Column C
                vis.graph.links.push({
                    "source": skilLevelKey,
                    "target": victoryStatusKey,
                    "value": victoryStatusValue.length
                });
            }
        }

        // loop through each link replacing the text with its index from node
        vis.graph.links.forEach(function (d, i) {
            vis.graph.links[i].source = vis.graph.nodes.indexOf(vis.graph.links[i].source);
            vis.graph.links[i].target = vis.graph.nodes.indexOf(vis.graph.links[i].target);
        });

        // now loop through each nodes to make nodes an array of objects
        // rather than an array of strings
        vis.graph.nodes.forEach(function (d, i) {
            vis.graph.nodes[i] = {"name": d};
        });

        vis.sankey
            .nodes(vis.graph.nodes)
            .links(vis.graph.links)
            .layout(32);

        vis.renderVis();
    }

    renderVis() {
        let vis = this;

        // Links
        vis.links = vis.chart
            .selectAll(".link")
            .data(vis.graph.links)
            .join("path")
            .attr("class", "link")
            .attr("d", vis.path)
            .style("stroke-width", d => Math.max(1, d.dy))
            .sort(function (a, b) {
                return b.dy - a.dy;
            });

        // Link titles
        vis.links.append("title")
            .text(d => d.source.name + " to " + d.target.name + "\n" + d.value);

        // Nodes
        vis.nodes = vis.chart
            .selectAll(".node")
            .data(vis.graph.nodes, d => d.dy);

        vis.nodesEnter = vis.nodes
            .join("g")
            .attr("class", "node")
            .attr("transform", d => "translate(" + d.x + "," + d.y + ")");

        vis.nodesEnter
            .append("rect")
            .attr("height", d => d.dy)
            .attr("width", vis.sankey.nodeWidth())
            .style("fill", d => {
                if (vis.unique_openings_set.has(d.name)) {
                    return vis.openingsColorPalette(d.name);
                } else if (vis.unique_skill_levels_set.has(d.name)) {
                    return vis.skillLevelsColorPalette(d.name);
                } else if (vis.unique_victory_status_set.has(d.name)) {
                    return vis.victoryStatusColorPalette(d.name);
                }
            })
            .style("stroke", d => d3.rgb(d.color).darker(2))
            .append("title")
            .text(d => d.name + "\n" + d.value);

        // Node titles
        vis.nodesEnter
            .append("text")
            .attr("x", -6)
            .attr("y", d => d.dy / 2)
            .attr("dy", ".35em")
            .attr("text-anchor", "end")
            .attr("font-size", "20")
            .attr("font-family", "Fantasy")
            .text(d => d.name)
            .filter(d => d.x < vis.width / 2)
            .attr("x", 6 + vis.sankey.nodeWidth())
            .attr("text-anchor", "start");
    }

    renderLegend() {
        let vis = this;
        let dataL = 0;
        let offset = 30;
        let skill_levels = ["Master", "Advanced", "Intermediate", "Beginner"];
        let rating_levels = ["above 2000", "1500 - 2000", "1000 - 1500", "0 - 1000"];
        let svglegend = d3.select(".legend").append("svg")
            .attr("width", vis.width)
            .attr("height", 150);

        // legend title
        let legend = svglegend.selectAll(".legend")
            .data(skill_levels)
            .join('g')
            .attr("class", "legend");

        legend.append("text")
            .attr("x", 0)
            .attr("y", 0)
            .attr("dy", ".7em")
            .text("Skill Levels: ")
            .style("font-size", "20px")
            .style("text-anchor", "start")
            .attr("alignment-baseline","middle");

        // legends
        legend.append('rect')
            .attr("x", 0)
            .attr("y", 30)
            .attr("width", 15)
            .attr("height", 15)
            .style("fill", function (d, i) {
                return vis.skillLevelsColorPalette(d);
            })
            .attr("transform", function (d, i) {
                if (i === 0) {
                    dataL = offset
                    return "translate(0,0)"
                } else {
                    let newdataL = dataL
                    dataL += offset
                    return "translate(0," + newdataL + ")"
                }
            });
        legend.append("text")
            .attr("x", 20)
            .attr("y", 30)
            .attr("dy", ".7em")
            .text(function (d, i) {
                return d + ": " + rating_levels[i] + " rating";
            })
            .style("font-size", "17px")
            .style("text-anchor", "start")
            .attr("alignment-baseline","middle")
            .attr("transform", function (d, i) {
                if (i === 0) {
                    dataL = offset
                    return "translate(0,0)"
                } else {
                    let newdataL = dataL
                    dataL += offset
                    return "translate(0," + newdataL + ")"
                }
            });
        legend.exit().remove();
    }

    // Function to create sankey logic for nodes and links
    create_sankey() {
        let sankey = {},
            nodeWidth = 24,
            nodePadding = 8,
            size = [1, 1],
            nodes = [],
            links = [];

        sankey.nodeWidth = function (_) {
            if (!arguments.length) return nodeWidth;
            nodeWidth = +_;
            return sankey;
        };

        sankey.nodePadding = function (_) {
            if (!arguments.length) return nodePadding;
            nodePadding = +_;
            return sankey;
        };

        sankey.nodes = function (_) {
            if (!arguments.length) return nodes;
            nodes = _;
            return sankey;
        };

        sankey.links = function (_) {
            if (!arguments.length) return links;
            links = _;
            return sankey;
        };

        sankey.size = function (_) {
            if (!arguments.length) return size;
            size = _;
            return sankey;
        };

        sankey.layout = function (iterations) {
            computeNodeLinks();
            computeNodeValues();
            computeNodeBreadths();
            computeNodeDepths(iterations);
            computeLinkDepths();
            return sankey;
        };

        sankey.relayout = function () {
            computeLinkDepths();
            return sankey;
        };

        sankey.link = function () {
            let curvature = .5;

            function link(d) {
                let x0 = d.source.x + d.source.dx,
                    x1 = d.target.x,
                    xi = d3.interpolateNumber(x0, x1),
                    x2 = xi(curvature),
                    x3 = xi(1 - curvature),
                    y0 = d.source.y + d.sy + d.dy / 2,
                    y1 = d.target.y + d.ty + d.dy / 2;
                return "M" + x0 + "," + y0
                    + "C" + x2 + "," + y0
                    + " " + x3 + "," + y1
                    + " " + x1 + "," + y1;
            }

            link.curvature = function (_) {
                if (!arguments.length) return curvature;
                curvature = +_;
                return link;
            };

            return link;
        };

        // Populate the sourceLinks and targetLinks for each node.
        // Also, if the source and target are not objects, assume they are indices.
        function computeNodeLinks() {
            nodes.forEach(function (node) {
                node.sourceLinks = [];
                node.targetLinks = [];
            });
            links.forEach(function (link) {
                let source = link.source,
                    target = link.target;
                if (typeof source === "number") source = link.source = nodes[link.source];
                if (typeof target === "number") target = link.target = nodes[link.target];
                source.sourceLinks.push(link);
                target.targetLinks.push(link);
            });
        }

        // Compute the value (size) of each node by summing the associated links.
        function computeNodeValues() {
            nodes.forEach(function (node) {
                node.value = Math.max(
                    d3.sum(node.sourceLinks, value),
                    d3.sum(node.targetLinks, value)
                );
            });
        }

        // Iteratively assign the breadth (x-position) for each node.
        // Nodes are assigned the maximum breadth of incoming neighbors plus one;
        // nodes with no incoming links are assigned breadth zero, while
        // nodes with no outgoing links are assigned the maximum breadth.
        function computeNodeBreadths() {
            let remainingNodes = nodes,
                nextNodes,
                x = 0;

            while (remainingNodes.length) {
                nextNodes = [];
                remainingNodes.forEach(function (node) {
                    node.x = x;
                    node.dx = nodeWidth;
                    node.sourceLinks.forEach(function (link) {
                        if (nextNodes.indexOf(link.target) < 0) {
                            nextNodes.push(link.target);
                        }
                    });
                });
                remainingNodes = nextNodes;
                ++x;
            }

            //
            moveSinksRight(x);
            scaleNodeBreadths((size[0] - nodeWidth) / (x - 1));
        }

        function moveSourcesRight() {
            nodes.forEach(function (node) {
                if (!node.targetLinks.length) {
                    node.x = d3.min(node.sourceLinks, function (d) {
                        return d.target.x;
                    }) - 1;
                }
            });
        }

        function moveSinksRight(x) {
            nodes.forEach(function (node) {
                if (!node.sourceLinks.length) {
                    node.x = x - 1;
                }
            });
        }

        function scaleNodeBreadths(kx) {
            nodes.forEach(function (node) {
                node.x *= kx;
            });
        }

        function computeNodeDepths(iterations) {
            // (TODO) Check if this updated code works
            let tempNodesByBreadth = d3.group(nodes, d => d.x);
            let nodesByBreadth = [];
            for (let [key, value] of tempNodesByBreadth) {
                nodesByBreadth.push(value);
            }
            //
            initializeNodeDepth();
            resolveCollisions();
            for (let alpha = 1; iterations > 0; --iterations) {
                relaxRightToLeft(alpha *= .99);
                resolveCollisions();
                relaxLeftToRight(alpha);
                resolveCollisions();
            }

            function initializeNodeDepth() {
                let ky = d3.min(nodesByBreadth, function (nodes) {
                    return (size[1] - (nodes.length - 1) * nodePadding) / d3.sum(nodes, value);
                });

                nodesByBreadth.forEach(function (nodes) {
                    nodes.forEach(function (node, i) {
                        node.y = i;
                        node.dy = node.value * ky;
                    });
                });

                links.forEach(function (link) {
                    link.dy = link.value * ky;
                });
            }

            function relaxLeftToRight(alpha) {
                nodesByBreadth.forEach(function (nodes, breadth) {
                    nodes.forEach(function (node) {
                        if (node.targetLinks.length) {
                            let y = d3.sum(node.targetLinks, weightedSource) / d3.sum(node.targetLinks, value);
                            node.y += (y - center(node)) * alpha;
                        }
                    });
                });

                function weightedSource(link) {
                    return center(link.source) * link.value;
                }
            }

            function relaxRightToLeft(alpha) {
                nodesByBreadth.slice().reverse().forEach(function (nodes) {
                    nodes.forEach(function (node) {
                        if (node.sourceLinks.length) {
                            var y = d3.sum(node.sourceLinks, weightedTarget) / d3.sum(node.sourceLinks, value);
                            node.y += (y - center(node)) * alpha;
                        }
                    });
                });

                function weightedTarget(link) {
                    return center(link.target) * link.value;
                }
            }

            function resolveCollisions() {
                nodesByBreadth.forEach(function (nodes) {
                    let node,
                        dy,
                        y0 = 0,
                        n = nodes.length,
                        i;

                    // Push any overlapping nodes down.
                    nodes.sort(ascendingDepth);
                    for (i = 0; i < n; ++i) {
                        node = nodes[i];
                        dy = y0 - node.y;
                        if (dy > 0) node.y += dy;
                        y0 = node.y + node.dy + nodePadding;
                    }

                    // If the bottommost node goes outside the bounds, push it back up.
                    dy = y0 - nodePadding - size[1];
                    if (dy > 0) {
                        y0 = node.y -= dy;

                        // Push any overlapping nodes back up.
                        for (i = n - 2; i >= 0; --i) {
                            node = nodes[i];
                            dy = node.y + node.dy + nodePadding - y0;
                            if (dy > 0) node.y -= dy;
                            y0 = node.y;
                        }
                    }
                });
            }

            function ascendingDepth(a, b) {
                return a.y - b.y;
            }
        }

        function computeLinkDepths() {
            nodes.forEach(function (node) {
                node.sourceLinks.sort(ascendingTargetDepth);
                node.targetLinks.sort(ascendingSourceDepth);
            });
            nodes.forEach(function (node) {
                let sy = 0, ty = 0;
                node.sourceLinks.forEach(function (link) {
                    link.sy = sy;
                    sy += link.dy;
                });
                node.targetLinks.forEach(function (link) {
                    link.ty = ty;
                    ty += link.dy;
                });
            });

            function ascendingSourceDepth(a, b) {
                return a.source.y - b.source.y;
            }

            function ascendingTargetDepth(a, b) {
                return a.target.y - b.target.y;
            }
        }

        function center(node) {
            return node.y + node.dy / 2;
        }

        function value(link) {
            return link.value;
        }

        return sankey;
    };
}