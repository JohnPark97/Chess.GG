class UserMoveTable {

    constructor(_config, _data, _dispatcher) {
        this.config = {
            parentElement: _config.parentElement,
            containerWidth: _config.containerWidth || 375,
            containerHeight: _config.containerHeight || 400,
            margin: {top: 15, right: 20, bottom: 20, left: 25}
        }
        this.data = _data;
        this.dispatcher = _dispatcher;
        this.initVis();
    }

    initVis() {
        let vis = this;

        vis.width = vis.config.containerWidth - vis.config.margin.left - vis.config.margin.right;
        vis.height = vis.config.containerHeight - vis.config.margin.top - vis.config.margin.bottom;

        vis.xScale = d3.scaleLinear()
            .range([0, vis.width - vis.config.margin.right]);

        vis.yScale = d3.scaleBand()
            .padding(0.3)
            .range([0, vis.height]);

        vis.xAxis = d3.axisBottom(vis.xScale)
            .tickSize(0)
            .tickFormat("");

        vis.yAxis = d3.axisLeft(vis.yScale)
            .tickSize(0)
            .tickFormat("");

        vis.svg = d3.select(vis.config.parentElement)
            .attr('width', vis.config.containerWidth)
            .attr('height', vis.config.containerHeight);

        vis.chart = vis.svg.append('g')
            .attr('transform', `translate(${vis.config.margin.left},${vis.config.margin.top})`);

        vis.xAxisG = vis.chart.append('g')
            .attr('class', 'x-axis')
            .attr('transform', `translate(0,${vis.height })`);

        // Append y-axis group
        vis.yAxisG = vis.chart.append('g')
            .attr('class', 'y-axis')
            .attr('transform', `translate(0,0)`);

        vis.updateVis();
    }

    updateVis() {
        let vis = this;

        vis.player_rating_data = player_rating_arr
            .filter(function(d) {
            for (let data of vis.data) {
                if (d.name == data.white_id) {
                    return d;
                }
            }
        });

        vis.player_rating_data.sort(function(a, b) {
            return d3.descending(+a.value, +b.value);
        });


        vis.player_rating_data = vis.player_rating_data.slice(0, 5);

        vis.opening_by_players = d3.rollup(vis.player_rating_data,
            function(d) {
                let opening_names = [];
                for (let data of vis.data) {
                    if (data.white_id == d[0].name) {
                        if (!opening_names.includes(data.opening_name)) {
                            opening_names.push(data.opening_name);
                        }
                    }
                }
                return opening_names;
        },
        d => d.name
        );


        vis.yScale.domain(vis.opening_by_players.keys());

        vis.renderVis();
    }

    renderVis() {
        let vis = this;

        vis.chart.selectAll('.list_openings')
            .data(vis.opening_by_players)
            .join('text')
            .attr("class", "list_openings")
            //y position of the label is halfway down the bar
            .attr("y", function (d, i) {
                return vis.yScale(d[0]) + vis.yScale.bandwidth() / 2 + 3.5;
            })
            //x position is 3 pixels to the right of the bar
            .attr("x", function (d) {
                return vis.xScale(0);
            })
            .text(function (d) {
                return d[1].toString().replaceAll('|', '&');
            });


        vis.xAxisG
            .call(vis.xAxis)
            .call(g => g.select('.domain').remove());


        vis.yAxisG
            .call(vis.yAxis)
            .call(g => g.select('.domain').remove())

    }
}