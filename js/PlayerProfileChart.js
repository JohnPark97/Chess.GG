class PlayerProfileChart {

    constructor(_config, _data, _dispatcher) {
        this.config = {
            parentElement: _config.parentElement,
            containerWidth: _config.containerWidth || 450,
            containerHeight: _config.containerHeight || 450,
            margin: {top: 30, right: 10, bottom: 20, left: 40}
        }
        this.data = _data;
        this.dispatcher = _dispatcher;
        this.player_data = [];
        this.initVis();
    }

    initVis() {
        let vis = this;

        vis.width = vis.config.containerWidth - vis.config.margin.left - vis.config.margin.right;
        vis.height = vis.config.containerHeight - vis.config.margin.top - vis.config.margin.bottom;

        vis.xScale = d3.scaleLinear()
            .range([0, vis.width - vis.config.margin.right]);

        vis.yScale = d3.scaleLinear()
            .range([0, vis.height]);

        vis.xAxis = d3.axisBottom(vis.xScale)
            .tickSize(5);

        vis.yAxis = d3.axisLeft(vis.yScale)
            .tickSize(5);

        vis.svg = d3.select(vis.config.parentElement)
            .attr('width', vis.config.containerWidth)
            .attr('height', vis.config.containerHeight);

        vis.chart = vis.svg.append('g')
            .attr('transform', `translate(${vis.config.margin.left + vis.config.margin.right},${vis.config.margin.top - vis.config.margin.bottom})`);

        vis.xAxisG = vis.chart.append('g')
            .attr('class', 'x-axis')
            .attr('transform', `translate(0,${vis.height})`);

        // Append y-axis group
        vis.yAxisG = vis.chart.append('g')
            .attr('class', 'y-axis')
            .attr('transform', `translate(${-2}, 0)`);

        vis.updateVis();

    }

    updateVis() {
        let vis = this;

        let white_rating_map = new Map(d3.rollup(vis.data, v => (d3.sum(v, d => d.white_rating) / v.length).toFixed(0), d => d.white_id));
        let black_rating_map = new Map(d3.rollup(vis.data, v => (d3.sum(v, d => d.black_rating) / v.length).toFixed(0), d => d.black_id));

        //convert map to an array
        let white_rating_array = Array.from(white_rating_map, ([name, value]) => ({name, value}));
        let black_rating_array = Array.from(black_rating_map, ([name, value]) => ({name, value}));


        let combined_array = white_rating_array.concat(black_rating_array);

        // round all ratings to hundres because it look very bad to put a line for each value
        // Math.round(value/100)*100
        let player_rating = d3.rollup(combined_array, v => Math.round((d3.sum(v, d => d.value) / v.length) / 100) * 100, d => d.name);

        vis.player_rating_data = d3.rollup(player_rating, d => d.length,
            function (d) {
                return d[1];
            });


        let data_to_array = Array.from(player_rating, ([name, value]) => ({name, value}));

        vis.player_rating_array = Array.from(vis.player_rating_data, ([name, value]) => ({name, value}));

        vis.player_rating_array.sort(function (a, b) {

            return d3.ascending(a.name, b.name);
        });

        if (selected_player) {
            vis.player_data = d3.rollup(vis.data,
                v => (d3.sum(v, function (d) {
                    if (d.white_id == selected_player) {
                        return d.white_rating;
                    } else if (d.black_id == selected_player) {
                        return d.black_rating;
                    }
                }) / v.length).toFixed(0),
                function (d) {
                    if (d.white_id == selected_player) {
                        return d.white_id;
                    } else if (d.black_id == selected_player) {
                        return d.black_id;
                    }
                });
            vis.player_data = Array.from(vis.player_data, ([name, value]) => ({ name, value }));


        }

        vis.xScale.domain([d3.min(data_to_array.values(), d => +d.value),
            d3.max(data_to_array.values(), d => +d.value)]);

        vis.yScale.domain([d3.max(vis.player_rating_array, d => +d.value), 0]);

        vis.chart.append('text')
            .attr('class', 'y-axis-title')
            .attr('y', -vis.config.margin.bottom / 2)
            .attr('x', vis.config.margin.left)
            .attr('dy', '.71em')
            .style('text-anchor', 'end')
            .style('font-family', 'Arial, Helvetica, sans-serif')
            .style('font-size', '14px')
            .style('font-weight', 600)
            .text('# of Players');

        vis.chart.append('text')
            .attr('class', 'x-axis-title')
            .attr('y', vis.height + vis.config.margin.bottom)
            .attr('x', vis.width/2 + vis.config.margin.left)
            .attr('dy', '.71em')
            .style('text-anchor', 'end')
            .style('font-family', 'Arial, Helvetica, sans-serif')
            .style('font-size', '13px')
            .style('font-weight', 600)
            .text('Average Ratings');

        vis.renderVis();
    }

    renderVis() {
        let vis = this;

        vis.chart.selectAll('.ratings')
            .data([vis.player_rating_array])
            .join('path')
            .attr("class", "ratings")
            .attr("fill", "none")
            .attr("stroke-width", .5)
            .attr("stroke", 'black')
            .attr("d", d3.line()
                .x(d => vis.xScale(+d.name))
                .y(d => vis.yScale(d.value))
                .curve(d3.curveStep)
            );


        vis.chart
            .selectAll('.dot')
            .data(vis.player_data.filter(function(d) {
                if (d.name == selected_player) {
                    return d;
                }
            }))
            .join('circle')
            .attr('class', 'dot')
            .attr('r', 8)
            .attr('cx', function(d) {
                return vis.xScale(d.value);
            })
            .attr('cy', function(d) {
                const val = Math.round(d.value/100)*100;
                return vis.yScale(vis.player_rating_data.get(val))
            })
            .on('mouseover', function (event, d) {
                d3.select('#tooltip')
                    .style('opacity', 1)
                    .html(
                        `<p>TO BE IMPLEMENTED</p>`
                    );

            })
            .on('mousemove', function (event) {

                d3.select('#tooltip')
                    .style('left', (event.pageX + 10) + 'px')
                    .style('top', (event.pageY) + 'px')
            })
            // tooltip disappears when mouse leaves the arc
            .on('mouseleave', function (event, d) {
                d3.select('#tooltip').style('opacity', 0);
            })


        vis.xAxisG
            .call(vis.xAxis)
            .call(g => g.select('.domain').remove());


        vis.yAxisG
            .call(vis.yAxis)
            .call(g => g.select('.domain').remove());
    }
}