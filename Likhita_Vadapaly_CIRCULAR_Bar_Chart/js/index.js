// chart dimensions
const MARGIN = Object.freeze({ top: 50, right: 20, bottom: 70, left: 30 });
const WIDTH = 1000 - MARGIN.left - MARGIN.right;
const HEIGHT = 500 - MARGIN.top - MARGIN.bottom;
const INNER_RADIUS = 70;
const OUTER_RADIUS = Math.min(WIDTH, HEIGHT) / 2; // the outerRadius goes from the middle of the SVG area to the border

// Data Category types
const COL_TYPES = Object.freeze({
  PROFIT: "PROFIT",
  SALES: "SALES",
});

const getAverageProfitPerState = (data) => {
  // sum up all profit in data set
  const result = Object.entries(data).map(([state, allData]) => {
    const totalProfit = allData.reduce(
      (acc, current) => acc + Number(current.Profit),
      0
    );

    // calculate the average
    const averageProfit = totalProfit / allData.length;
    return { State: state, averageProfit };
  });
  return result;
};

const getAverageSales = (data) => {
  // sum up all sales in data set
  const result = Object.entries(data).map(([state, allData]) => {
    const totalSales = allData.reduce(
      (acc, current) => acc + Number(current.Sales),
      0
    );

    // calculate the average
    const averageSales = totalSales / allData.length;
    return { State: state, averageSales };
  });
  return result;
};

const groupDataByYear = (data) => {
  const acc = {};
  data.forEach((current) => {
    //   extract year from Order date
    const orderDate = new Date(current["Order Date"]);
    const year = orderDate.getFullYear();

    //add current data to it's year cluster
    if (!(year in acc)) acc[year] = [current];
    else acc[year].push(current);
  });
  return acc;
};

const groupByCol = (data, col) => {
  const acc = {};
  data.forEach((current) => {
    //   extract category from Order date
    const fieldVal = current[col];

    //add current data to it's year cluster
    if (!(fieldVal in acc)) acc[fieldVal] = [current];
    else acc[fieldVal].push(current);
  });
  return acc;
};

// create and append svg into DOM
const chartSVG = d3
  .select("#chart_container")
  .append("svg")
  .attr("width", WIDTH + MARGIN.left + MARGIN.right)
  .attr("height", HEIGHT + MARGIN.top + MARGIN.bottom);

// select elements created at the 3 chart containers
const selectOptions = d3.select("#chart_container > #data").select("select");

//   construct bar and append in chart
const chart = chartSVG.append("g");

// handles filtering of data based on the selected drop-down option and data cols
// needed to plot chart
const deriveChartData = (
  data,
  option,
  optionCol = "",
  type = "averageProfit"
) => {
  let result;
  let options;
  let groupData;

  // group the data based on the dropdown options e.g category or year.
  switch (optionCol) {
    case "year":
      groupData = groupDataByYear(data);
      break;
    case "category":
      groupData = groupByCol(data, "Category");
      break;
    default:
  }
  const xGroup = groupByCol(groupData[option], "State");

  // use the above grouped data compute the data based on
  // the x and y cols e.g average profit, average sales
  switch (type) {
    case "averageProfit":
      result = getAverageProfitPerState(xGroup);
      options = Object.keys(groupData);
      break;
    case "averageSales":
      result = getAverageSales(xGroup);
      options = Object.keys(groupData);

    default:
  }

  return { options, data: result };
};

// read csv file and plot chart
d3.csv("../data/superstore_new1.csv", function (d) {
  return { ...d };
}).then((data) => {
  console.log(data);

  // //Render chart 3 in it's own namespace
  (() => {
    const [xLabel, yLabel] = ["STATES", "AVERAGE PROFIT ($)"];
    const [yCol, xCol] = ["averageProfit", "State"];
    renderLinePlotSqaure({
      allData: data,
      xCol,
      yCol,
      xLabel,
      yLabel,
      option: "Furniture",
      optionCol: "category",
      chart,
      category: "Category",
      optionSelector: "#chart_container > #data",
    });
  })();
});

// handle chart drawing
const renderLinePlotSqaure = ({
  allData,
  xCol,
  yCol,
  xLabel = "",
  yLabel = "",
  option,
  optionCol = "",
  chart = chart1,
  optionSelector = "",
}) => {
  // data change handler
  function dataChangeHandler(d) {
    renderLinePlotSqaure({
      allData,
      xCol,
      yCol,
      xLabel,
      yLabel,
      option: this.value,
      optionCol,
      chart,
      optionSelector,
    });
  }

  const { data, options } = deriveChartData(allData, option, optionCol, yCol);

  // clear canvas previous state before rendering
  chart.selectAll("*").remove();

  // X scale
  const x = d3
    .scaleBand()
    .range([0, 2 * Math.PI]) // X axis goes from 0 to 2pi = all around the circle. If I stop at 1Pi, it will be around a half circle
    .domain(data.map((d) => d[xCol])); // The domain of the X axis is the list of states.

  // Y scale
  const y = d3
    .scaleRadial()
    .domain([
      d3.min(data, (data) => data[yCol]) - 30,
      d3.max(data, (data) => data[yCol]) + 30,
    ])
    .range([HEIGHT / 2.0, 0]);

const sigFig = data => {
   return "$" + d3.format(",.2f")(data); }

  // Add bars
  chart
    .selectAll("path")
    .data(data)
    .enter()
    .append("path")
    .attr("fill", "#ADD8E6")
    .attr(
      "d",
      d3
        .arc() //
        .innerRadius(INNER_RADIUS)
        .outerRadius((d) => y(d[yCol]))
        .startAngle((d) => x(d[xCol]))
        .endAngle((d) => x(d[xCol]) + x.bandwidth())
        .padAngle(0.01)
        .padRadius(INNER_RADIUS)
    )
    .attr("transform", `translate(${WIDTH / 2}, ${HEIGHT / 1.5})`);

  // Add the labels
  chart
    .append("g")
    .attr("transform", `translate(${WIDTH / 2}, ${HEIGHT / 1.5})`)
    .selectAll("g")
    .data(data)
    .enter()
    .append("g")

    .attr("text-anchor", function (d) {
      return (x(d[xCol]) + x.bandwidth()/2  + Math.PI) % (2 * Math.PI) <
        Math.PI
        ? "end"
        : "start";
    })
    .attr("transform", function (d) {
      return (
        "rotate(" +
        (((x(d[xCol]) + x.bandwidth()/2) * 180) / Math.PI - 90) +
        ")" +
        "translate(" +
        (y(d[yCol]) + 20) +
        ",0)"
      );
    })
    .append("text")
    .text(function (d) {
      return d[xCol];
    })
    .attr("transform", function (d) {
      return (x(d[xCol]) + x.bandwidth() / 2 + Math.PI) % (2 * Math.PI) <
        Math.PI
        ? "rotate(180)"
        : "rotate(0)";
    })
    .transition()
    .duration(1000)
    .style("font-size", "12px")
    .style("font-weight", "800")
    .attr("alignment-baseline", "middle");
// second label
    chart
    .append("g")
    .attr("transform", `translate(${WIDTH / 2}, ${HEIGHT / 1.5})`)
    .selectAll("g")
    .data(data)
    .enter()
    .append("g")

    .attr("text-anchor", function (d) {
      return (x(d[xCol]) + x.bandwidth()/2  + Math.PI) % (2 * Math.PI) <
        Math.PI
        ? "end"
        : "start";
    })
    .attr("transform", function (d) {
      return (
        "rotate(" +
        (((x(d[xCol]) + x.bandwidth()/2 ) * 180) / Math.PI - 90) +
        ")" +
        "translate(" +
        (y(d[yCol]) - 40) +
        ",0)"
      );
    })
    .append("text")
    .text(function (d) {
       return  sigFig(y(d[yCol]))
      })
    .attr("transform", function (d) {
      return (x(d[xCol]) + x.bandwidth() / 2 + Math.PI) % (2 * Math.PI) <
        Math.PI
        ? "rotate(180)"
        : "rotate(0)";
    })
    .attr('fill','#005d6e')
    .transition()
    .duration(1000)
    .style("font-size", "8px")
    .style('font-style', 'italic')
    .style("font-weight", "800")
    .attr("alignment-baseline", "middle");

  chart.selectAll(".label").data(data).exit().remove();

  //   fill the options into the select dropdown
  const selectOptions = d3
    .select(optionSelector)
    .select("select")
    .on("change", dataChangeHandler)
    .selectAll("option")
    .data(options)
    .enter()
    .append("option");

  selectOptions.select("option:first-child").attr("selected", true);
  selectOptions.append("span").text((data) => data);
};
