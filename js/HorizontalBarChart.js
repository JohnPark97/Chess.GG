class HorizontalBarChart {

    constructor(_config, _data, _dispatcher) {
        this.config = {
            parentElement: _config.parentElement,
            containerWidth: _config.containerWidth || 600,
            containerHeight: _config.containerHeight || 73500,
            margin: {top: 30, right: 20, bottom: 20, left: 25}
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
            .attr('transform', `translate(${0},${0})`);

        vis.xAxisG = vis.chart.append('g')
            .attr('class', 'x-axis')
            .attr('transform', `translate(0,${vis.height + vis.config.margin.top})`);

        // Append y-axis group
        vis.yAxisG = vis.chart.append('g')
            .attr('class', 'y-axis')
            .attr('transform', `translate(0,0)`);

        vis.updateVis();
    }

    updateVis() {
        let vis = this;

        let map = new Map(d3.rollup(vis.data, d => d.length, d => d.opening_name));
        //convert map to an array
        vis.grouped_data = Array.from(map, ([name, value]) => ({ name, value }));

        vis.grouped_data.sort(function(a, b) {
            return d3.descending(a.value, b.value);
        });

        vis.xScale.domain([0, d3.max(vis.grouped_data.values()).value]);

        vis.yScale.domain(vis.grouped_data.keys());


        vis.renderVis();
    }


    renderVis() {
        let vis = this;

        // add bars
        vis.chart.selectAll('.bar')
            .data(vis.grouped_data)
            .join('rect')
            .attr('class', 'bar')
            .attr('id', d => d.name)
            .attr('width', function(d) {
                return vis.xScale(d.value);
            })
            .attr('height', function() {
                return vis.yScale.bandwidth();
            })
            .attr("x", vis.xScale(0))
            .attr('y', function (d, i) {
                return vis.yScale(i);
            })
            .attr("padding", .5)
            .attr("fill", "#bfffc3")
            .attr("opacity", 1)
            .attr("style", "outline: 0.2px solid black;")
            .on("click", function(event, d) {
                // Check if current category is active and toggle class
                const isActive = d3.select(this).classed('active');
                d3.select(this).classed('active', !isActive);

                // deselect all users that were selected before
                d3.selectAll('.username.active').attr("fill", '#00052d')
                d3.selectAll('.username.active').classed('active', false);

                if (isActive) {
                    d3.select(this).attr("fill", "#bfffc3")
                } else {
                    d3.select(this).attr("fill", "#02A031")
                }


                const selectedOpenings = vis.chart.selectAll('.bar.active').data().map(k => k.name);
                vis.dispatcher.call('filter_opening', event, selectedOpenings);
            });

        vis.chart.selectAll('.count')
            .data(vis.grouped_data)
            .join('text')
            .attr("class", "count")
            //y position of the label is halfway down the bar
            .attr("y", function (d, i) {
                return vis.yScale(i) + vis.yScale.bandwidth() / 2 + 3.5;
            })
            //x position is 3 pixels to the right of the bar
            .attr("x", function (d) {
                return vis.xScale(d.value) + 5;
            })
            .text(function (d) {
                return d.value;
            });



        vis.xAxisG
            .call(vis.xAxis)
            .call(g => g.select('.domain').remove());


        vis.yAxisG
            .call(vis.yAxis)
            .call(g => g.select('.domain').remove());
    }

    updateFilter() {
        let vis = this;

        const filters = d3.select('#filters')
            .selectAll('button')
            .data(selected_filters)
            .join('button')
            //.text(d => d)
            .attr('id', d => d)
            .text(d => '\u2A09'+ ' ' + d)
            .on("click", function (event, d) {
                const canceled_value = d3.select(this).attr("id");
                const index = selected_filters.indexOf(canceled_value)
                if (index > -1) {
                    selected_filters.splice(index, 1);
                }

                // deselect all players
                d3.selectAll('.username.active').attr("fill", '#00052d')
                d3.selectAll('.username.active').classed('active', false);

                // deselect the corresponding bar
                d3.selectAll('.bar.active')
                    .classed('active', function (d) {
                        if (!selected_filters.includes(d.name)) {
                            return false;
                        } else return true;
                    })
                    .attr("fill", function(d) {
                        if (selected_filters.includes(d.name)) {
                            return "#02A031";
                        } else return "#bfffc3";
                    })

                vis.dispatcher.call('filter_opening', event, selected_filters);
            })



    }
}