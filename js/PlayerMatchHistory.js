class PlayerMatchHistory {

    constructor(_config, _data, _dispatcher) {
        this.config = {
            parentElement: _config.parentElement,
            containerWidth: _config.containerWidth || 400,
            containerHeight: _config.containerHeight || 300,
            margin: {top: 30, right: 10, bottom: 20, left: 30}
        }
        this.data = _data;
        this.dispatcher = _dispatcher;
        this.initVis();
    }

    initVis() {
        let vis = this;

        vis.width = vis.config.containerWidth - vis.config.margin.left - vis.config.margin.right;
        vis.height = vis.config.containerHeight - vis.config.margin.top - vis.config.margin.bottom;

        vis.svg = d3.select(vis.config.parentElement)
            .attr('width', vis.config.containerWidth)
            .attr('height', vis.config.containerHeight);

        vis.chart = vis.svg.append('g')
            .attr('transform', `translate(${vis.config.margin.left},${vis.config.margin.top - vis.config.margin.bottom})`);

        vis.chart.append('#vs')

        vis.updateVis();
    }

    updateVis() {
        let vis = this;


        //sort by lastest matches
        vis.data.sort(function(a, b) {
            return d3.descending(a.created_at, b.created_at);
        });


        //slice the data to show only top 3 data
        vis.top_three_data = vis.data.slice(0,3);


        vis.opponents = []
        for (let d of vis.top_three_data) {
            if (d.white_id == selected_player) {
                vis.opponents.push(d.black_id);
            } else {
                vis.opponents.push(d.white_id);
            }
        }


        vis.renderVis();
    }

    renderVis() {

        let vis = this;

        const button = d3.select('#selectButton')
            .selectAll('.options')
            .data(vis.opponents)
            .join('option')
            .attr("class", "options")
            .text(function (d) { return d; }) // text showed in the menu
            .attr("value", function (d) { return d; }) // corresponding value returned by the button

        d3.select('#turns')
            .selectAll('text')
            .data(vis.top_three_data.filter(function(d, i) {
                const button_val = d3.select("#selectButton").node().value;
                const button_index = d3.select("#selectButton").node().selectedIndex;
                if ((button_val == d.white_id || button_val == d.black_id)&&
                button_index == i) {
                    return d;
                }

            }))
            .join('text')
            .attr("class", "text")
            .style("font-style", 'normal')
            .style("font-weight", 'normal')
            .text(function(d) {
                return " " + d.turns;
            })

        d3.select('#match-result')
            .selectAll('text')
            .data(vis.top_three_data.filter(function(d, i) {
                const button_val = d3.select("#selectButton").node().value;
                const button_index = d3.select("#selectButton").node().selectedIndex;
                if ((button_val == d.white_id || button_val == d.black_id)&&
                    button_index == i) {
                    return d;
                }
            }))
            .join('text')
            .style("font-style", 'normal')
            .style("font-weight", 'normal')
            .text(function(d) {
                let result_string = "Lost by ";
                if (d.victory_status == "draw") {
                    result_string = "Ended with "
                } else if ((d.winner == 'white' && d.white_id == selected_player) ||
                           (d.winner == 'black' && d.black_id == selected_player)) {
                     result_string = "Won by ";
                }
                return " " + result_string + d.victory_status;
            })

        vis.filtered = vis.top_three_data.filter(function(d, i) {
            const button_val = d3.select("#selectButton").node().value;
            const button_index = d3.select("#selectButton").node().selectedIndex;
            if ((button_val == d.white_id || button_val == d.black_id)&&
                button_index == i) {
                return d;
            }
        });

        vis.moves = [];
        if (vis.filtered[0]) {
            vis.moves = vis.filtered[0].moves.split(" ");
        }


        d3.select('#moves')
            .selectAll('text')
            .data(vis.moves)
            .join('text')
            .attr('class', 'move')
            .attr("id", function(d, i) {
                return i;
            })
            .style("color", 'black')
            .style("font-style", 'normal')
            .style("font-weight", 'normal')
            .text(function(d) {
                return " " + d;
            })
            .on("click", function (event, d) {
                // Check if current category is active and toggle class
                const isActive = d3.select(this).classed('active');
                d3.selectAll('.move.active').style("color", "black")
                d3.selectAll('.move.active').classed('active', false);
                if (!isActive) {
                    d3.select(this).classed('active', !isActive);
                }

                if (isActive) {
                    d3.select(this).style("color", "black")
                } else {
                    d3.select(this).style("color", "red")
                }
                curr_moves = vis.moves;

                const selectedMoveId = d3.select(this).attr("id");
                // convert the id to integer for further computation
                vis.dispatcher.call('filter_chess_board', event, +selectedMoveId, isActive);
            })

        d3.select('#move-used')
            .selectAll('text')
            .data(vis.top_three_data.filter(function(d, i) {
                const button_val = d3.select("#selectButton").node().value;
                const button_index = d3.select("#selectButton").node().selectedIndex;
                if ((button_val == d.white_id || button_val == d.black_id)&&
                    button_index == i) {
                    return d;
                }
            }))
            .join('text')
            .style("font-style", 'normal')
            .style("font-weight", 'normal')
            .text(function(d) {
                return " " + d.opening_name;
            })

        d3.select('#white-id')
            .selectAll('text')
            .data(vis.top_three_data.filter(function(d, i) {
                const button_val = d3.select("#selectButton").node().value;
                const button_index = d3.select("#selectButton").node().selectedIndex;
                if ((button_val == d.white_id || button_val == d.black_id)&&
                    button_index == i) {
                    return d;
                }
            }))
            .join('text')
            .style("font-style", 'normal')
            .style("font-weight", 'normal')
            .text(function (d) {
                return ' ' + d.white_id;
            })

        d3.select('#black-id')
            .selectAll('text')
            .data(vis.top_three_data.filter(function(d, i) {
                const button_val = d3.select("#selectButton").node().value;
                const button_index = d3.select("#selectButton").node().selectedIndex;
                if ((button_val == d.white_id || button_val == d.black_id)&&
                    button_index == i) {
                    return d;
                }
            }))
            .join('text')
            .style("font-style", 'normal')
            .style("font-weight", 'normal')
            .text(function (d) {
                return ' ' + d.black_id;
            })

    }

}