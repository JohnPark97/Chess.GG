class RatingScatterPlot {

    constructor(_config, _data, _dispatcher) {
        this.config = {
            parentElement: _config.parentElement,
            containerWidth: _config.containerWidth || 550,
            containerHeight: _config.containerHeight || 400,
            tooltipPadding: _config.tooltipPadding || 15,
            margin: {top: 50, right: 20, bottom: 55, left: 60}
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
            .range([0, vis.width]);

        vis.yScale = d3.scaleLinear()
            .range([vis.height, 0]);

        vis.xAxis = d3.axisBottom(vis.xScale)
            .tickSize(5);

        vis.yAxis = d3.axisLeft(vis.yScale)
            .tickSize(5);

        vis.svg = d3.select(vis.config.parentElement)
            .attr('width', vis.config.containerWidth)
            .attr('height', vis.config.containerHeight);

        vis.chart = vis.svg.append('g')
            .attr('transform', `translate(${vis.config.margin.left},${vis.config.margin.top})`)

        vis.xAxisG = vis.chart.append('g')
            .attr('class', 'x-axis')
            .attr('transform', `translate(0,${vis.height + vis.config.margin.bottom/4})`)
            .style('font-size', '12px');

        // Append y-axis group
        vis.yAxisG = vis.chart.append('g')
            .attr('class', 'y-axis')
            .attr('transform', `translate(${-vis.config.margin.right/2},${0})`)
            .style('font-size', '12px');

        vis.chart.append('text')
            .attr('class', 'y-axis-title')
            .attr('y', -vis.config.margin.bottom / 2)
            .attr('x', vis.config.margin.left + 30)
            .attr('dy', '.71em')
            .style('text-anchor', 'end')
            .style('font-family', 'Arial, Helvetica, sans-serif')
            .style('font-size', '14px')
            .style('font-weight', 600)
            .text('Rating of White Player');

        vis.chart.append('text')
            .attr('class', 'x-axis-title')
            .attr('y', vis.height + vis.config.margin.bottom - 15)
            .attr('x', vis.width/2 + vis.config.margin.left)
            .attr('dy', '.71em')
            .style('text-anchor', 'end')
            .style('font-family', 'Arial, Helvetica, sans-serif')
            .style('font-size', '13px')
            .style('font-weight', 600)
            .text('Rating of Black Player');

        vis.updateVis();

    }

    updateVis() {
        let vis = this;

        vis.xScale.domain([Math.round(d3.min(vis.data, d => +d.black_rating)/100) *100, d3.max(vis.data, d => +d.black_rating)]);
        vis.yScale.domain([Math.round(d3.min(vis.data, d => +d.white_rating)/100) *100, d3.max(vis.data, d => +d.white_rating)]);

        vis.renderVis();
    }

    renderVis() {
        let vis = this;

        let scatter = vis.chart.selectAll('.point')
            .data(vis.data)
            .join('circle')
            .attr('class', 'point')
            .attr('r', '6px')
            .attr("cx", function(d) {
                return vis.xScale(d.black_rating)
            })
            .attr('cy', function (d) {
                return vis.yScale(d.white_rating);
            })
            .attr("fill", d => {
                if (d.winner == "black") {
                    return "#fdb001"
                } if (d.winner == "white") {
                    return "#396fc9"
                } return "#58584d"
            })
            .attr("fill-opacity", 0.7);

        scatter.on('mouseover', (event,d) => {
            d3.select('#scatter-plot-tooltip')
                .style('display', 'block')
                .style('left', (event.pageX + vis.config.tooltipPadding) + 'px')
                .style('top', (event.pageY + vis.config.tooltipPadding) + 'px')
                .html(`
              <div class="tooltip-title">Extra Information:</div>
<!--              <div><i>${d.country}, ${d.start_year} - ${d.end_year}</i></div>-->
              <ul>
                <li>Winner: ${d.winner}</li>
                <li>Opening Name: ${d.opening_name}</li>
                <li>Black Player Rating: ${d.black_rating}</li>
                <li>White Player Rating: ${d.white_rating}</li>
                <li>Game Time:  </li>
              </ul>
            `);
        })
            .on('mouseleave', () => {
                d3.select('#scatter-plot-tooltip').style('display', 'none');
            });

        scatter.exit().remove();

        vis.xAxisG
            .call(vis.xAxis)
            .call(g => g.select('.domain').remove());

        vis.yAxisG
            .call(vis.yAxis)
            .call(g => g.select('.domain').remove());

    }
}