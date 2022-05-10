// chart dimensions
const MARGIN = Object.freeze({ top: 50, right: 20, bottom: 70, left: 30 });
const WIDTH = 1440 - MARGIN.left - MARGIN.right;
const HEIGHT = 550 - MARGIN.top - MARGIN.bottom;
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
const selectOptions1 = d3.select("#chart_container > #data").select("select");

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

  // Render chart 1 in it's own namespace
  (() => {
    const [xLabel, yLabel] = ["STATES", "AVERAGE PROFIT ($)"];
    const [yCol, xCol] = ["averageProfit", "State"];
    renderChart({
      allData: data,
      xCol,
      yCol,
      xLabel,
      yLabel,
      option: 2014,
      optionCol: "year",
      chart,
      optionSelector: "#chart_container> #data",
    });
  })();
});

// handles chart drawing
const renderChart = ({
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
  // clear canvas previous state before rendering
  chart.selectAll("*").remove();

  // data change handler
  function dataChangeHandler(d) {
    renderChart({
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
  // construct dynamic x-scale based on current data
  const x = d3
    .scaleBand()
    .rangeRound([70, WIDTH])
    .padding(0.4)
    .domain(data.map((d) => d[xCol]));

  // construct dynamic y-scale based on current data
  const y = d3
    .scaleLinear()
    .domain([
      d3.min(data, (data) => data[yCol]) - 30,
      d3.max(data, (data) => data[yCol]) + 30,
    ])
    .range([HEIGHT, 0]);

  // set X and Y labels
  chart
    .append("g")
    .attr("transform", `translate(0, ${HEIGHT})`)
    .call(d3.axisBottom(x))
    .selectAll("text")
    .attr("transform", "translate(-10,10)rotate(-45)")
    .style("text-anchor", "end")
    .style("font-size", 14)
    .style("fill", "#69a3b2");
  chart.append("g").attr("transform", `translate(70, 0)`).call(d3.axisLeft(y));

  // Add X axis label:
  chart
    .append("text")
    .attr("text-anchor", "center")
    .attr("x", WIDTH)
    .attr("y", HEIGHT + MARGIN.top + 70)
    .style("font-size", 25)
    .style("font-weight", 700)
    .text(xLabel);

  // Y axis label:
  chart
    .append("text")
    .attr("text-anchor", "end")
    .attr("transform", "rotate(-90)")
    .attr("y", -MARGIN.left + 60)
    .attr("x", -MARGIN.top)
    .style("font-size", 25)
    .style("font-weight", 700)
    .text(yLabel);

  //   create bars
  chart
    .selectAll(".chart-bar")
    .data(data)
    .enter()
    .append("rect")
    .classed("chart-bar", true)
    .attr("x", (data) => x(data[xCol]))
    .attr("y", (data) => y(data[yCol]))
    .transition()
    .duration(1000)
    .attr("width", x.bandwidth())
    .attr("height", (data) => HEIGHT - y(data[yCol]))

    .attr("fill", "purple");

  // clear DOM when exiting
  chart.selectAll(".chart-bar").data(data).exit().remove();

  // add y value on every bar
  chart
    .selectAll(".label")
    .data(data)
    .enter()
    .append("text")
    .text((data) => Math.round(data[yCol]))
    .attr("x", (data) => x(data[xCol]) + x.bandwidth() / 2)
    .attr("y", (data) => y(data[yCol]) - 5)
    .attr("text-anchor", "middle")
    .classed("label", true);

  chart.selectAll(".label").data(data).exit().remove();

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
