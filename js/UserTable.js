class UserTable {

    constructor(_config, _data, _dispatcher) {
        this.config = {
            parentElement: _config.parentElement,
            containerWidth: _config.containerWidth || 300,
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
            .tickFormat(function(d) {
                const num = d + 1;
                return num + ". "
            });

        vis.svg = d3.select(vis.config.parentElement)
            .attr('width', vis.config.containerWidth)
            .attr('height', vis.config.containerHeight);

        vis.chart = vis.svg.append('g')
            .attr('transform', `translate(${vis.config.margin.left},${vis.config.margin.top})`);

        vis.xAxisG = vis.chart.append('g')
            .attr('class', 'x-axis')
            .attr('transform', `translate(0,${vis.height})`);

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

        vis.yScale.domain(vis.player_rating_data.keys());

        vis.renderVis();
    }

    renderVis() {
        let vis = this;

        vis.chart.selectAll('.username')
            .data(vis.player_rating_data)
            .join('text')
            .attr("class", "username")
            //y position of the label is halfway down the bar
            .attr("y", function (d, i) {
                return vis.yScale(i) + vis.yScale.bandwidth() / 2 + 3.5;
            })
            //x position is 3 pixels to the right of the bar
            .attr("x", function (d) {
                return vis.xScale(0);
            })
            .text(function (d) {
                return d.name + " (" + d.value + ")";
            })
            .on("click", function(event, d) {
                // Check if current category is active and toggle class
                const isActive = d3.select(this).classed('active');
                d3.selectAll('.username.active').attr("fill", '#00052d')
                d3.selectAll('.username.active').classed('active', false);
                if (!isActive) {
                    d3.select(this).classed('active', !isActive);
                }

                if (isActive) {
                    d3.select(this).attr("fill", '#00052d')
                } else {
                    d3.select(this).attr("fill", "red")
                }

                const selectedPlayer = vis.chart.selectAll('.username.active').data().map(k => k.name);
                vis.dispatcher.call('filter_player', event, selectedPlayer);
            });


        vis.xAxisG
            .call(vis.xAxis)
            .call(g => g.select('.domain').remove());


        vis.yAxisG
            .call(vis.yAxis)
            .call(g => g.select('.domain').remove())

    }
}