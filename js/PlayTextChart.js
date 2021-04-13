class PlayTextChart {

    constructor(_config, _data) {
        this.config = {
            parentElement: _config.parentElement,
            containerWidth: _config.containerWidth || 350,
            containerHeight: _config.containerHeight || 73500,
            margin: {top: 30, right: 20, bottom: 20, left: 30}
        }
        this.data = _data;
        this.initVis();
    }

    initVis() {
        let vis = this;

        vis.width = vis.config.containerWidth - vis.config.margin.left - vis.config.margin.right;
        vis.height = vis.config.containerHeight - vis.config.margin.top - vis.config.margin.bottom;

        vis.xScale = d3.scaleBand()
            .range([0, vis.width - vis.config.margin.right]);

        vis.yScale = d3.scaleBand()
            .padding(0.3)
            .range([0, vis.height]);

        vis.xAxis = d3.axisBottom(vis.xScale)
            .tickFormat(d => d);

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
            .attr('transform', `translate(${vis.config.margin.left},${0})`);

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

        //convert map to an array
        let map = new Map(d3.rollup(vis.data, d => d.length, d => d.opening_name));
        vis.grouped_data = Array.from(map, ([name, value]) => ({ name, value }));

        vis.grouped_data.sort(function(a, b) {
            return d3.descending(a.value, b.value);
        });

        vis.yScale.domain(vis.grouped_data.keys());


        vis.renderVis();
    }


    renderVis() {
        let vis = this;


        vis.chart.selectAll('.playname')
            .data(vis.grouped_data)
            .join('text')
            .attr("class", "playname")
            //y position of the label is halfway down the bar
            .attr("y", function (d, i) {
                return vis.yScale(i) + vis.yScale.bandwidth() / 2 + 4.5;
            })
            //x position is 3 pixels to the right of the bar
            .attr("x", function (d) {
                return vis.xScale(0);
            })
            .text(function (d) {
                return d.name;
            });

        vis.xAxisG
            .call(vis.xAxis)
            .call(g => g.select('.domain').remove());


        vis.yAxisG
            .call(vis.yAxis)
            .call(g => g.select('.domain').remove())
    }
}