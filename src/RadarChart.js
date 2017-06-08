/////////////////////////////////////////////////////////
/////////////// The Radar Chart Function ////////////////
/////////////// Written by Nadieh Bremer ////////////////
////////////////// VisualCinnamon.com ///////////////////
/////////// Inspired by the code of alangrafu ///////////
///////// Adapted to E6 and D3 v4 by tacastillo /////////
/////////////////////////////////////////////////////////

let d3 = require('d3');
	
class RadarChart {
	
	init = (id, data, options) => {
		let config = {
			w: options.width,				//Width of the circle
			h: options.height,				//Height of the circle
			margin: {top: 20, right: 0, bottom: 20, left: 20}, //The margins of the SVG
			levels: 3,				//How many levels or inner circles should there be drawn
			maxValue: 1, 			//What is the value that the biggest circle will represent
			labelFactor: 1.2, 	//How much farther than the radius of the outer circle should the labels be placed
			wrapWidth: 60, 		//The number of pixels after which a label needs to be given a new line
			opacityArea: 0.5, 	//The opacity of the area of the blob
			dotRadius: 4, 			//The size of the colored circles of each blog
			opacityCircles: 0.2, 	//The opacity of the circles of each blob
			strokeWidth: 2, 		//The width of the stroke around each blob
			roundStrokes: false,	//If true the area and stroke will follow a round path (cardinal-closed),
			mouseOverFunction: options.mouseOverFunction,
			mouseOutFunction: options.mouseOutFunction
		};
		//Put all of the options into a variable called config
		if('undefined' !== typeof options){
		  for (let i in options){
			if('undefined' !== typeof options[i]){
				config[i] = options[i];
			}
		  }//for i
		}//if
		
		//If the supplied maxValue is smaller than the actual one, replace by the max in the data
		const maxValue = Math.max(config.maxValue, d3.max(data, i => d3.max(i.map(o => o.yValue))));

		let allAxis = (data[0].map((i,j) => i.xValue)),	//Names of each axis
			total = allAxis.length,					//The number of different axes
			radius = Math.min(config.w/2, config.h/2), 	//Radius of the outermost circle
			Format = d3.format(".0%"),			 	//Percentage formatting
			angleSlice = Math.PI * 2 / total;		//The width in radians of each "slice"
		
		//Scale for the radius
		let rScale = d3.scaleLinear()
			.range([0, radius])
			.domain([0, maxValue]);
			
		/////////////////////////////////////////////////////////
		//////////// Create the container SVG and g /////////////
		/////////////////////////////////////////////////////////

		//Remove whatever chart with the same id/class was present before
		d3.select(id).select("svg").remove();
		
		//Initiate the radar chart SVG
		let svg = d3.select(id).append("svg")
			.attr("width",  config.w + config.margin.left + config.margin.right)
			.attr("height", config.h + config.margin.top + config.margin.bottom)
			.attr("class", "radar"+id);
		//Append a g element		
		let g = svg.append("g")
				.attr("transform", "translate(" + (config.w/2 + config.margin.left) + "," + (config.h/2 + config.margin.top) + ")");
		
		/////////////////////////////////////////////////////////
		////////// Glow filter for some extra pizzazz ///////////
		/////////////////////////////////////////////////////////
		
		//Filter for the outside glow
		let filter = g.append('defs').append('filter').attr('id','glow'),
			feGaussianBlur = filter.append('feGaussianBlur').attr('stdDeviation','2').attr('result','coloredBlur'),
			feMerge = filter.append('feMerge'),
			feMergeNode_1 = feMerge.append('feMergeNode').attr('in','coloredBlur'),
			feMergeNode_2 = feMerge.append('feMergeNode').attr('in','SourceGraphic');

		/////////////////////////////////////////////////////////
		/////////////// Draw the Circular grid //////////////////
		/////////////////////////////////////////////////////////
		
		//Wrapper for the grid & axes
		let axisGrid = g.append("g").attr("class", "axisWrapper");
		
		//Draw the background circles
		axisGrid.selectAll(".levels")
		   .data(d3.range(1,(config.levels+1)).reverse())
		   .enter()
			.append("circle")
			.attr("class", "gridCircle")
			.attr("r", (d, i) => {return radius/config.levels*d;})
			.style("fill", "#CDCDCD")
			.style("stroke", "#CDCDCD")
			.style("fill-opacity", config.opacityCircles)
			.style("filter" , "url(#glow)");

		//Text indicating at what % each level is
		axisGrid.selectAll(".axisLabel")
		   .data(d3.range(1,(config.levels+1)).reverse())
		   .enter().append("text")
		   .attr("class", "axisLabel")
		   .attr("x", 4)
		   .attr("y", function(d){return -d*radius/config.levels;})
		   .attr("dy", "0.4em")
		   .style("font-size", "10px")
		   .attr("fill", "#737373")
		   .text(function(d,i) { return Format(maxValue * d/config.levels); });

		/////////////////////////////////////////////////////////
		//////////////////// Draw the axes //////////////////////
		/////////////////////////////////////////////////////////
		
		//Create the straight lines radiating outward from the center
		let axis = axisGrid.selectAll(".axis")
			.data(allAxis)
			.enter()
			.append("g")
			.attr("class", "axis");
		//Append the lines
		axis.append("line")
			.attr("x1", 0)
			.attr("y1", 0)
			.attr("x2", function(d, i){ return rScale(maxValue) * Math.cos(angleSlice*i - Math.PI/2); })
			.attr("y2", function(d, i){ return rScale(maxValue) * Math.sin(angleSlice*i - Math.PI/2); })
			.attr("class", "line")
			.style("stroke", "white")
			.style("stroke-width", "1px");

		//Append the labels at each axis
		axis.append("text")
			.attr("class", "legend")
			.style("font-size", "14px")
			.attr("text-anchor", "middle")
			.attr("dy", "0.35em")
			.attr("x", function(d, i){ return rScale(maxValue * config.labelFactor) * Math.cos(angleSlice*i - Math.PI/2); })
			.attr("y", function(d, i){ return rScale(maxValue * config.labelFactor) * Math.sin(angleSlice*i - Math.PI/2); })
			.text(function(d){return d})
			.on("mouseover", config.mouseOverFunction)
			.call(wrap, config.wrapWidth);

		/////////////////////////////////////////////////////////
		///////////// Draw the radar chart blobs ////////////////
		/////////////////////////////////////////////////////////
		
		//The radial line function
		let radarLine = d3.radialLine()
			.radius(function(d) { return rScale(d.yValue); })
			.angle(function(d,i) {	return i*angleSlice; })
			.curve(d3.curveLinearClosed);
			
		if(config.roundStrokes) {
			radarLine.curve(d3.curveCardinalClosed);
		}
					
		//Create a wrapper for the blobs	
		let blobWrapper = g.selectAll(".radarWrapper")
			.data(data)
			.enter().append("g")
			.attr("class", "radarWrapper");
				
		//Append the backgrounds	
		blobWrapper
			.append("path")
			.attr("class", "radarArea")
			.attr("d", (d,i) => radarLine(d))
			.style("fill", "#F78812")
			.style("fill-opacity", config.opacityArea)
			.on('mouseover', function (d,i){
				d3.select(this)
					.transition().duration(200)
					.style("fill-opacity", 0.85);
				config.mouseOutFunction();
			})
			.on('mouseout', function(){
				//Bring back all blobs
				d3.select(this)
					.transition().duration(200)
					.style("fill-opacity", config.opacityArea);
			});
			
		//Create the outlines	
		blobWrapper.append("path")
			.attr("class", "radarStroke")
			.attr("d", d => radarLine(d))
			.style("stroke-width", config.strokeWidth + "px")
			.style("stroke", "#F78812")
			.style("fill", "none")
			.style("filter" , "url(#glow)");
		
		//Append the circles
		blobWrapper.selectAll(".radarCircle")
			.data(d => d)
			.enter().append("circle")
			.attr("class", "radarCircle")
			.attr("r", config.dotRadius)
			.attr("cx", (d,i) => rScale(d.yValue) * Math.cos(angleSlice*i - Math.PI/2))
			.attr("cy", (d,i) => rScale(d.yValue) * Math.sin(angleSlice*i - Math.PI/2))
			.style("fill", "#F78812")
			.style("fill-opacity", 0.8)

		/////////////////////////////////////////////////////////
		//////// Append invisible circles for tooltip ///////////
		/////////////////////////////////////////////////////////
		
		//Wrapper for the invisible circles on top
		let blobCircleWrapper = g.selectAll(".radarCircleWrapper")
			.data(data)
			.enter().append("g")
			.attr("class", "radarCircleWrapper");
			
		//Append a set of invisible circles on top for the mouseover pop-up
		blobCircleWrapper.selectAll(".radarInvisibleCircle")
			.data(function(d,i) { return d; })
			.enter().append("circle")
			.attr("class", "radarInvisibleCircle")
			.attr("r", config.dotRadius*1.5)
			.attr("cx", function(d,i){ return rScale(d.yValue) * Math.cos(angleSlice*i - Math.PI/2); })
			.attr("cy", function(d,i){ return rScale(d.yValue) * Math.sin(angleSlice*i - Math.PI/2); })
			.style("fill", "none")
			.style("pointer-events", "all")
			.on("mouseover", function(d,i) {
				let newX =  parseFloat(d3.select(this).attr('cx')) - 10;
				let newY =  parseFloat(d3.select(this).attr('cy')) - 10;
						
				tooltip
					.attr('x', newX)
					.attr('y', newY)
					.text(Format(d.yValue))
					.transition().duration(200)
					.style('opacity', 1);
			})
			.on("mouseout", function(){
				tooltip.transition().duration(200)
					.style("opacity", 0);
			});
			
		//Set up the small tooltip for when you hover over a circle
		let tooltip = g.append("text")
			.attr("class", "tooltip")
			.style("opacity", 0);
		
		/////////////////////////////////////////////////////////
		/////////////////// Helper Function /////////////////////
		/////////////////////////////////////////////////////////

		//Taken from http://bl.ocks.org/mbostock/7555321
		//Wraps SVG text	
		function wrap(text, width) {
		  text.each(function() {
			let text = d3.select(this),
				words = text.text().split(/\s+/).reverse(),
				word,
				line = [],
				lineNumber = 0,
				lineHeight = 1.4, // ems
				y = text.attr("y"),
				x = text.attr("x"),
				dy = parseFloat(text.attr("dy")),
				tspan = text.text(null).append("tspan").attr("x", x).attr("y", y).attr("dy", dy + "em");
				
			while (word = words.pop()) {
			  line.push(word);
			  tspan.text(line.join(" "));
			  if (tspan.node().getComputedTextLength() > width) {
				line.pop();
				tspan.text(line.join(" "));
				line = [word];
				tspan = text.append("tspan").attr("x", x).attr("y", y).attr("dy", ++lineNumber * lineHeight + dy + "em").text(word);
			  }
			}
		  });
		}//wrap	
	}
}//RadarChart

export default RadarChart;