// # am5-helper
/**
 * Helper classes to interact with AmChart5 libs
 * 2024 Provetic.
 */
/**
 * AmChart Render Handler
 */
class AMCHandler {
  /** @var {string} */
  chartId;

  /** @var {object} */
  chartOpts;

  /** @var {AMC} */
  #amc;

  /**
   * AMCHandler constructor
   * @param {object} chartOpts
   */
  constructor(chartOpts) {
    chartOpts = chartOpts ?? {};
    const chartId = chartOpts.chartId ?? undefined;
    delete chartOpts.chartId;
    this.chartOpts = chartOpts;
    if (chartId) this.chartId = chartId;
  }

  /**
   * Assign event of given method
   * @param {string} method
   * @param {Event|PointerEvent} event
   * @param {undefined|Function} callback
   */
  static on(method, event, callback) {
    const self = new AMCHandler();
    if (typeof self[method] === "function") {
      const result = self[method](event);
      if (typeof callback === "function") callback(result);
    }
    else console.error(`AMCHandler: method not found: ${method}`);
  }

  /**
   * Get dataContext of given event click on bullets
   * @param {Event|PointerEvent} event
   * @return {null|object} target.dataItem.dataContext
   */
  getDataContext(event) {
    const target = event && event.target ? event.target : null;
    if (!target) return !1;
    const dataItem = target && target.dataItem
      ? target.dataItem
      : null;
    return dataItem && dataItem.dataContext
      ? dataItem.dataContext
      : null;
  }

  /**
   * Handle click on bullets (general case).
   * An alias for this.getDataContext
   * @param {Event} event
   * @return {null|object} target.dataItem.dataContext
   */
  click(event) {
    return this.getDataContext(event);
  }

  /**
   * Handle click on bullets of daily dist sentiment
   * @param {Event} event
   * @return {null|object} of:
   * {
   *   startStamp: {int},
   *   endStamp: {int},
   * }
   */
  clickDailyDist(event) {
    const context = this.getDataContext(event);
    const date = context && context.date ? context.date : null;
    if (!date) {
      console.error(`[clickDailyDist]: Missing dataContext.date`);
      return null;
    }
    this.validateHandlerDependencies('moment');
    const start = date ? moment(date) : null;
    const end = start
      ? moment(start).add(1, 'days').subtract(1, 'seconds')
      : null;
    if (!start || !end) return null;
    return {
      startStamp: start.unix(),
      endStamp: end.unix(),
    };
  }

  /**
   * Handle click on bullets of daily dist sentiment
   * @param {Event} event
   * @return {null|object} of:
   * {
   *   startStamp: {int},
   *   endStamp: {int},
   * }
   */
  clickHourlyDist(event) {
    const context = this.getDataContext(event);
    const date = context && context.date ? context.date : null;
    if (!date) {
      console.error(`[clickHourlyDist]: Missing dataContext.date`);
      return null;
    }
    this.validateHandlerDependencies('moment');
    const start = date ? moment(date) : null;
    const end = start
      ? moment(start).add(1, 'hours').subtract(1, 'seconds')
      : null;
    if (!start || !end) return null;
    return {
      startStamp: start.unix(),
      endStamp: end.unix(),
    };
  }

  /**
   * Validate AMCHandler dependencies of given deps
   * @param {string|array} deps
   */
  validateHandlerDependencies(deps) {
    const name = 'validateDependencies';
    if (typeof deps === "string") deps = deps.split(",");
    if (!Array.isArray(deps))
      throw new Error(`[${name}]: Given deps must be an array or string`);
    deps.forEach((lib) => {
      if ('undefined' === typeof window[lib])
        throw new Error(`[${name}]: Missing dependency: ${lib}`);
    });
  }

  /**
   * Get AMC instance
   * @param {?string} chartId
   * @param {?object} params of:
   * {
   *   chartOpts: {object},
   *   ?rootOpts: {object},
   *   ?themes: {array},
   * }
   * @return {AMC}
   */
  getAmc(chartId, params) {
    return this.#amc ? this.#amc : this.initAmc(chartId, params);
  }

  /**
   * Initialize AMC instance only if not already initialized
   * @param {?string} chartId
   * @param {?object} params of:
   * {
   *   chartOpts: {object},
   *   ?rootOpts: {object},
   *   ?themes: {array},
   * }
   * @return {AMC}
   */
  initAmc(chartId, params) {
    chartId = chartId ?? this.chartId ?? "";
    params = params ?? {};
    params.chartOpts = {
      ...(params.chartOpts ?? {}),
      ...(this.chartOpts ?? {}),
    }
    return this.#amc = new AMC(chartId, params);
  }

  /**
   * Get amc chart
   * @return {am5.Chart}
   */
  getAmcChart() {
    if (this.#amc) return this.#amc.getChart();
    throw new Error(`[getAmcChart]: AMC instance not found`);
  }

  /**
   * Initialize before handling render chart:
   * - remove disposed logo
   */
  initialize() {
    const chartId = this.chartId;
    const amc = this.getAmc(chartId);
    if (amc.isLogoDisposed()) {
      $(`#${chartId}`).parent().find('.credit-layer').remove();
    }
  }

  /**
   * @deprecated
   * Run callback after rendering chart
   * @param {am5.Chart} chart
   */
  afterRender(chart) {
    const chartOpts = this.chartOpts;

    // Adjust showing grid on xAxis and yAxis
    (() => {
      const xAxis = chart.xAxes?.getIndex(0);
      const yAxis = chart.yAxes?.getIndex(0);
      // Axes are not initialized yet or not defined in type of chart
      if (!xAxis || !yAxis) return;

      const xAxisRenderer = xAxis.get('renderer');
      if (xAxisRenderer) {
        xAxisRenderer.grid?.template?.set("visible", chartOpts.xAxis.showGrid);
      }

      const yRenderer = yAxis.get('renderer');
      if (yRenderer) {
        const yAxisOpts = chartOpts.yAxis ?? {};
        yRenderer.grid?.template?.set("visible", !!yAxisOpts.showGrid);
        yRenderer.labels?.template?.set("visible", !!yAxisOpts.showLabels);
        yRenderer.set("visible", yAxisOpts.showGrid || yAxisOpts.showLabels);
      }
    })()
  }

  /**
   * Prepare chart for appearance
   * @param {?am5.Chart} chart
   */
  #beforeChartAppear(chart) {
    chart = chart ?? this.getAmcChart();
    if (!chart) return !1;
    const chartOpts = this.chartOpts;

    // Adjust showing grid on Axes, yAxis labels and line.
    (() => {
      const xAxis = chart.xAxes?.getIndex(0);
      const yAxis = chart.yAxes?.getIndex(0);

      // Axes are not initialized or undefined for this type of chart
      if (!xAxis || !yAxis) return;

      const xAxisRenderer = xAxis.get('renderer');
      if (xAxisRenderer) {
        xAxisRenderer.grid?.template?.set("visible", !!(chartOpts.xAxis?.showGrid ?? true));
      }

      const yRenderer = yAxis.get('renderer');
      if (yRenderer) {
        const yAxisOpts = chartOpts.yAxis ?? {};
        yRenderer.grid?.template?.set("visible", !!yAxisOpts.showGrid);
        yRenderer.labels?.template?.set("visible", !!yAxisOpts.showLabels);
        yRenderer.set("visible", yAxisOpts.showGrid || yAxisOpts.showLabels);
      }
    })();

    // Apply templateField to columns of chart.series (instance of am5xy.ColumnSeries)
    (() => {
      chart.series.each(series => {
      if (series instanceof am5xy.ColumnSeries) {
        series.columns?.template?.setAll({
          templateField: "data_settings"
        });
      }
    });
    })()
  }

  /**
   * Trigger appearance of chart
   * @param {?int} duration
   * @param {?int} delay
   * @return {am5.Chart}
   */
  triggerChartAppearance(duration, delay) {
    const chart = this.getAmcChart();
    if (!chart) return !1;

    this.#beforeChartAppear();

    chart.appear(
      duration ?? AMCData.CHART_FADE_IN,
      delay ?? AMCData.CHART_DELAY
    );

    return chart;
  }

  /**
   * Trigger appearance of chart element.
   * @param {am5.Chart|am5.XYChart|am5.PieChart|am5.Series} obj
   * @return {am5.Chart|am5.XYChart|am5.PieChart|am5.Series}
   */
  triggerAppearanceOf(obj) {
    if (!obj) return obj;
    if (typeof obj.appear === "function") {
      this.#beforeChartAppear();
      return obj.appear(AMCData.CHART_FADE_IN, AMCData.CHART_DELAY);
    }
    return obj;
  }

  /**
   * Render smooth line of inc growth
   * @param {array} rawData
   */
  smoothLineIncGrowth(rawData) {
    this.initialize();
    const seriesData = AMC.dto('seriesDataIncGrowth', rawData);
    const itemsData = AMC.dto('itemsDataIncGrowth', rawData);

    const chartOpts = this.chartOpts;
    const amc = this.getAmc(this.chartId, { chartOpts });
    const root = amc.createRoot();
    const chart = amc.createXYChart(root);
    amc.setCursor(chart, { behavior: "zoomX" });

    const xAxisOpts = chartOpts.xAxis ? chartOpts.xAxis : {};
    const xAxis = amc.setXDateAxis(chart);

    /** @var {object|bool} */
    let minorDateFormats = xAxisOpts.minorDateFormats ?? null;
    minorDateFormats = [true, null].indexOf(minorDateFormats) !== -1
      ? {day: "dd/MM"}
      : (typeof minorDateFormats === "object" ? minorDateFormats : false);
    if (minorDateFormats) xAxis.set("minorDateFormats", minorDateFormats);

    const yAxis = amc.setYAxis(chart);

    const legendOpts = chartOpts.legend ?? {};
    const labelValueOpts = legendOpts.labelValue ?? {};
    const createSeries = (name, field, colorOpts) => {
      const series = chart.series.push(am5xy.SmoothedXLineSeries.new(root, {
        name,
        ...(colorOpts ? colorOpts : {}),
        xAxis: xAxis,
        yAxis: yAxis,
        valueYField: field,
        valueXField: `${xAxisOpts.categoryField}`,
        tooltip: am5.Tooltip.new(root, {
          labelText: "{name}: {valueY}"
        }),
        // legendLabelText: "[{stroke}]{name}[/]",
        // legendRangeLabelText: "[fontSize: 14px {stroke}]{name}[/]",
        // legendValueText: "[fontSize: 13px bold]{valueY}[/]",
        ...(!labelValueOpts.visible
          ? { legendValueText: "" }
          : { legendValueText: amc.getLegendValueTextFormat() }),
        legendRangeValueText: "[{stroke}]{valueYClose}[/]"
      }));
      amc.setSeriesTemplate(series);
      amc.setSeriesDataProcessor(series);
      amc.setBullets(series, seriesData);
      return series;
    };
    // end: createSeries
    itemsData.forEach((item) => {
      const setting = item.settings ?? null;
      const colorOpts = setting && setting.stroke
        ? {
          stroke: am5.color(setting.stroke),
          fill: am5.color(setting.fill ?? setting.stroke),
        }
        : undefined;
      const series = createSeries(item.label, item.ch_key, colorOpts);
      series.appear(AMCData.SERIES_FADE_IN);
    });

    const legend = amc.setLegend();
    if (legend) {
      legend.data.setAll(chart.series.values);
      legend.appear(500);
    }

    return this.triggerChartAppearance();
  }

  // An alias of smoothLineIncGrowth
  smoothLineDiffGrowth(rawData) {
    return this.smoothLineIncGrowth(rawData);
  }

  /**
   * Render smooth line of top tracker
   * @param {array} rawData
   * @param {array} itemsData
   */
  smoothLineTopTracker(rawData, itemsData) {
    this.initialize();
    const seriesData = AMCData.get('seriesDataTopTracker', rawData);
    itemsData = AMCData.get('itemsDataTopTracker', itemsData);

    const chartOpts = this.chartOpts;
    const amc = this.getAmc(this.chartId, { chartOpts });
    const root = amc.createRoot();
    const chart = amc.createXYChart(root, {
      paddingLeft: 10,
    });
    amc.setCursor(chart, { behavior: "zoomX" });

    // Create axes
    const xAxisOpts = chartOpts.xAxis ? chartOpts.xAxis : {};
    const xAxis = amc.setXDateAxis(chart);
    xAxis.get("dateFormats")["hour"] = `[bold]HH:mm[/]`;
    if (xAxisOpts.categoryDateFormat)
      xAxis.get("periodChangeDateFormats")["hour"] = `[bold]${xAxisOpts.categoryDateFormat}[/]`;

    /** @var {object|bool} */
    let minorDateFormats = xAxisOpts.minorDateFormats ?? null;
    minorDateFormats = [true, null].indexOf(minorDateFormats) !== -1
      ? {hour: "HH", day: "dd/MM"}
      : (typeof minorDateFormats === "object" ? minorDateFormats : false);
    if (minorDateFormats) xAxis.set("minorDateFormats", minorDateFormats);

    const yAxis = amc.setYAxis(chart);
    const cursorOpts = chartOpts.cursor ?? {};
    const tooltipOpts = cursorOpts.tooltip ?? {};
    delete tooltipOpts.labelText;
    const createSeries = (name, field, colorOpts) => {
      const series = chart.series.push(am5xy.SmoothedXLineSeries.new(root, {
        name,
        ...(colorOpts ? colorOpts : {}),
        xAxis: xAxis,
        yAxis: yAxis,
        valueYField: field,
        valueXField: `${xAxisOpts.categoryField}`,
        tooltip: am5.Tooltip.new(root, {
          labelText: "{name}: [bold]{valueY}[/]",
          ...tooltipOpts,
        }),
        // legendLabelText: "[{stroke}]{name}[/]",
        // legendRangeLabelText: "[fontSize: 14px {stroke}]{name}[/]",
        // legendValueText: "[fontSize: 13px bold]{valueY}[/]",
        legendValueText: amc.getLegendValueTextFormat(),
        // ...(!labelValueOpts.visible
        //   ? {legendValueText: ""}
        //   : {legendValueText: amc.getLegendValueTextFormat()}),
        legendRangeValueText: "[{stroke}]{valueYClose}[/]"
      }));
      amc.setSeriesTemplate(series);
      amc.setSeriesDataProcessor(series);
      amc.setBullets(series, seriesData);
      return series;
    };
    itemsData.forEach((item) => {
      const setting = item.settings ?? null;
      const colorOpts = setting && setting.stroke
        ? {
          stroke: am5.color(setting.stroke),
          fill: am5.color(setting.fill ?? setting.stroke),
        }
        : undefined;
      const series = createSeries(item.label, item.ch_key, colorOpts);
      series.appear(AMCData.SERIES_FADE_IN);
    });

    const legend = amc.setLegend();
    if (legend) {
      legend.data.setAll(chart.series.values);
      legend.appear(AMCData.SERIES_FADE_IN);
    }

    return this.triggerChartAppearance();
  }

  /**
   * Render smooth line of tracker thumbnail
   * @param {array} rawData
   * @param {object} itemData
   */
  smoothLineTrackerTumbnail(rawData, itemData) {
    this.initialize();
    const seriesData = [...rawData];

    const chartOpts = this.chartOpts;
    const amc = this.getAmc(this.chartId, { chartOpts });
    const root = amc.createRoot();
    const chart = amc.createXYChart(root);
    amc.setCursor(chart);

    const xAxisOpts = chartOpts.xAxis ? chartOpts.xAxis : {};
    const dateAxisParams = {
      renderer: am5xy.AxisRendererX.new(root, {
        minorGridEnabled: true,
        minGridDistance: 40,
        minorLabelsEnabled: false,
      }),
    };
    const xAxis = amc.setXDateAxis(chart, dateAxisParams);
    const periodChangeFormat = 'periodChangeDateFormats';
    xAxis.set(periodChangeFormat, {
      ...xAxis.get(periodChangeFormat),
      day: `[bold]dd MMM[/]`,
    });

    /** @var {object|bool} */
    let minorDateFormats = xAxisOpts.minorDateFormats ?? null;
    minorDateFormats = [true, null].indexOf(minorDateFormats) !== -1
      ? {hour: "HH:mm"}
      : (typeof minorDateFormats === "object" ? minorDateFormats : false);
    if (minorDateFormats) {
      xAxis.set("minorDateFormats", {
        ...xAxis.get("minorDateFormats"),
        ...minorDateFormats,
      });
    }

    const yAxis = amc.setYAxis(chart);
    const colorOpts = ((item) => {
      const setting = item.settings ?? null;
      const colorOpts = setting && setting.stroke
        ? {
          stroke: am5.color(setting.stroke),
          fill: am5.color(setting.fill ?? setting.stroke),
        }
        : undefined;
      return colorOpts;
    })(itemData);

    const seriesOpts = chartOpts.series ?? {};
    const name = seriesOpts.name || 'Total';

    const series = chart.series.push(am5xy.LineSeries.new(root, {
      name,
      ...(colorOpts ? colorOpts : {}),
      xAxis: xAxis,
      yAxis: yAxis,
      valueYField: `${chartOpts.yAxis.valueYField}`,
      valueXField: `${xAxisOpts.categoryField}`,
    }));
    amc.setSeriesTemplate(series);
    amc.setSeriesDataProcessor(series);
    amc.setBullets(series, seriesData);

    return this.triggerChartAppearance();
  }

  /**
   * Render stacked column of growth data, issue daily dist.
   * @see https://codepen.io/idoenk/pen/KKOqWrq
   * @param {array} rawData
   */
  stackedColumnGrowth(rawData) {
    this.initialize();
    const seriesData = AMC.dto('seriesDataIncGrowth', rawData);
    const itemsData = AMC.dto('itemsDataIncGrowth', rawData);

    const chartOpts = this.chartOpts;
    const amc = this.getAmc(this.chartId, { chartOpts });
    const root = amc.createRoot();
    const chart = amc.createXYChart(root);
    amc.setCursor(chart, { behavior: "zoomX" });

    const xAxisOpts = chartOpts.xAxis ? chartOpts.xAxis : {};
    const xAxis = amc.setXDateAxis(chart);

    /** @var {object|bool} */
    let minorDateFormats = xAxisOpts.minorDateFormats ?? null;
    minorDateFormats = [true, null].indexOf(minorDateFormats) !== -1
      ? {day: "dd/MM"}
      : (typeof minorDateFormats === "object" ? minorDateFormats : false);
    if (minorDateFormats) xAxis.set("minorDateFormats", minorDateFormats);

    const yAxis = amc.setYAxis(chart, {
      min: 0,
    });

    const legendOpts = chartOpts.legend ?? {};
    const labelValueOpts = legendOpts.labelValue ?? {};
    const legendValueText = amc.getLegendValueTextFormat()
    const createSeries = (name, field, colorOpts) => {
      const series = chart.series.push(am5xy.ColumnSeries.new(root, {
        name,
        ...(colorOpts ? colorOpts : {}),
        stacked: true,
        xAxis: xAxis,
        yAxis: yAxis,
        valueYField: field,
        valueXField: `${xAxisOpts.categoryField}`,
        tooltip: am5.Tooltip.new(root, {
          labelText: "{name}: [bold]{valueY}[/]",
        }),
        ...(!labelValueOpts.visible
          ? { legendValueText: "" }
          : { legendValueText }),
        legendRangeValueText: "[{stroke}]{valueYClose}[/]",
      }));
      amc.setSeriesDataProcessor(series);
      series.data.setAll(seriesData);
      series.appear(AMCData.SERIES_FADE_IN);
    };
    itemsData.forEach(item => {
      const setting = item.settings ?? null;
      const colorOpts = setting && setting.stroke
        ? {
          stroke: am5.color(setting.stroke),
          fill: am5.color(setting.fill ?? setting.stroke),
        }
        : undefined;
      createSeries(item.label, item.ch_key, colorOpts);
    });
    const legend = amc.setLegend();
    if (legend) {
      legend.data.setAll(chart.series.values);
      legend.appear(AMCData.SERIES_FADE_IN);
    }

    return this.triggerChartAppearance();
  }

  /**
   * Render stacked column of top daily engagement growth data
   * @param {array} rawData
   * @param {array} itemsData
   */
  topDailyStackedColumn(seriesData, itemsData) {
    this.initialize();
    itemsData = AMC.dto('itemsDataTopDailyStackedColumn', itemsData);

    const chartOpts = this.chartOpts;
    const amc = this.getAmc(this.chartId, { chartOpts });
    const root = amc.createRoot();
    const chart = amc.createXYChart(root);
    amc.setCursor(chart, { behavior: "zoomX" });

    const xAxisOpts = chartOpts.xAxis ? chartOpts.xAxis : {};
    const xAxis = amc.setXDateAxis(chart);

    /** @var {object|bool} */
    let minorDateFormats = xAxisOpts.minorDateFormats ?? null;
    minorDateFormats = [true, null].indexOf(minorDateFormats) !== -1
      ? {day: "dd/MM"}
      : (typeof minorDateFormats === "object" ? minorDateFormats : false);
    if (minorDateFormats) xAxis.set("minorDateFormats", minorDateFormats);

    const yAxis = amc.setYAxis(chart, {
      min: 0,
    });

    const seriesOpts = chartOpts.series ?? {};
    const cursorOpts = chartOpts.cursor ?? {};
    const tooltipOpts = cursorOpts.tooltip ?? {};
    delete tooltipOpts.labelText;
    const legendOpts = chartOpts.legend ?? {};
    const labelValueOpts = legendOpts.labelValue ?? {};
    const legendValueText = amc.getLegendValueTextFormat()

    const createSeries = (name, index, colorOpts) => {
      let field = (seriesOpts.yField ?? 'value');
      const tooltipField = field === 'escore' ? 'Engage score' : 'Posts';
      field += `_${index}`;
      const series = chart.series.push(am5xy.ColumnSeries.new(root, {
        name,
        ...(colorOpts ? colorOpts : {}),
        stacked: true,
        xAxis: xAxis,
        yAxis: yAxis,
        valueYField: field,
        valueXField: `${xAxisOpts.categoryField}`,
        tooltip: am5.Tooltip.new(root, {
          labelText: `${tooltipField}: [bold]{valueY}[/]`,
          ...tooltipOpts,
        }),
        ...(!labelValueOpts.visible
          ? { legendValueText: "" }
          : { legendValueText }),
        legendRangeValueText: "[{stroke}]{valueYClose}[/]",
      }));
      amc.setSeriesTemplate(series);
      amc.setSeriesDataProcessor(series);
      return series;
    };
    itemsData.forEach((item, index) => {
      const setting = item.settings ?? null;
      const colorOpts = setting && setting.stroke
        ? {
          stroke: am5.color(setting.stroke),
          fill: am5.color(setting.fill ?? setting.stroke),
        }
        : undefined;
      const series = createSeries(item.label, index, colorOpts);
      series.data.setAll(seriesData);
      series.appear(AMCData.SERIES_FADE_IN);
    });
    const legend = amc.setLegend();
    if (legend) {
      legend.data.setAll(chart.series.values);
      legend.appear(AMCData.SERIES_FADE_IN);
    }

    return this.triggerChartAppearance();
  }

  /**
   * Render combined stacked column and line chart of growth data
   * @param {array} rawData
   */
  combinedStackedColumnLineGrowth(rawData) {
    this.initialize();
    const seriesData = AMC.dto('seriesDataCombinedGrowth', rawData);
    const itemsData = AMC.dto('itemsDataCombinedGrowth', rawData);

    const hasDiff = seriesData
      .find((item) => "undefined" !== typeof item['diff_0']);

    const chartOpts = this.chartOpts;
    const amc = this.getAmc(this.chartId, { chartOpts });
    const root = amc.createRoot();
    root.dateFormatter.setAll({
      dateFormat: "yyyy-MM-dd",
      dateFields: ["valueX"]
    });
    const chart = amc.createXYChart(root, {
      layout: root.verticalLayout,
    });

    const cursor = amc.setCursor(chart, { behavior: "zoomX" });
    if (cursor) cursor.lineY.set("visible", false);

    const xAxisOpts = chartOpts.xAxis ? chartOpts.xAxis : {};
    const xAxis = amc.setXDateAxis(chart);

    /** @var {object|bool} */
    let minorDateFormats = xAxisOpts.minorDateFormats ?? null;
    minorDateFormats = [true, null].indexOf(minorDateFormats) !== -1
      ? {day: "dd/MM"}
      : (typeof minorDateFormats === "object" ? minorDateFormats : false);
    if (minorDateFormats) xAxis.set("minorDateFormats", minorDateFormats);

    const yAxisBase = amc.setYAxis(chart, {
      min: 0,
      pan: "zoom",
    });

    const yRenderer = am5xy.AxisRendererY.new(root, {
      opposite: true
    });
    yRenderer.grid.template.set("forceHidden", true);
    const yAxis2nd = amc.setYAxis(chart, {
      renderer: yRenderer,
      syncWithAxis: yAxisBase
    });

    const cursorOpts = chartOpts.cursor ?? {};
    const tooltipOpts = cursorOpts.tooltip ?? {};
    delete tooltipOpts.labelText;
    const legendOpts = chartOpts.legend ?? {};
    const labelValueOpts = legendOpts.labelValue ?? {};
    const legendValueText = amc.getLegendValueTextFormat();

    /**
     * Create column series of given name, field
     * @param {string} chartMode of line, column
     * @param {string} name chart name
     * @param {int} index of chart to generate field
     * @param {object} colorOpts
     */
    const createSeries = (chartMode, name, index, colorOpts) => {
      let series;
      const isColumn = chartMode === 'column';
      const valueYField = isColumn ? `total_${index}` : `diff_${index}`;
      const tooltipField = isColumn ? 'Total' : 'Diff';

      // reusable series options
      const seriesOpts = {
        name,
        valueYField,
        xAxis,
        valueXField: `${xAxisOpts.categoryField}`,
        tooltip: am5.Tooltip.new(root, {
          labelText: `${tooltipField}: [bold]{valueY}[/]`,
          ...tooltipOpts,
        }),
        legendRangeValueText: "[{stroke}]{valueYClose}[/]",
        ...(!labelValueOpts.visible
          ? { legendValueText: "" }
          : { legendValueText }),
        ...(colorOpts ? colorOpts : {}),
      };

      switch (chartMode) {
        case "column":
          series = chart.series.push(am5xy.ColumnSeries.new(root, {
            ...seriesOpts,
            yAxis: yAxisBase,
            stacked: true,
            clustered: false,
          }));
          break;

        case "line":
          series = chart.series.push(am5xy.SmoothedXLineSeries.new(root, {
            ...seriesOpts,
            yAxis: yAxis2nd,
          }));
          break;
      };
      amc.setSeriesTemplate(series);
      amc.setSeriesDataProcessor(series);
      if (chartMode === 'line') amc.setBullets(series, seriesData);
      return series;
    }

    // add series in specific order
    ['column', 'line'].forEach((chartMode) => {
      // skip render line-chart when no data of item.diff_?
      if (chartMode === 'line' && !hasDiff) return !0;
      itemsData.forEach((item, index) => {
        const setting = item.settings ?? null;
        const colorOpts = setting
          ? {
            stroke: am5.color(setting.stroke ?? setting.fill),
            fill: am5.color(setting.fill ?? setting.stroke),
          }
          : undefined;
        const series = createSeries(chartMode, item.label, index, colorOpts);
        series.data.setAll(seriesData);
        series.appear(AMCData.SERIES_FADE_IN);
      });
    })

    const legend = amc.setLegend({ useDefaultMarker: false });
    if (legend) {
      legend.data.setAll(chart.series.values);
      legend.appear(AMCData.SERIES_FADE_IN);
    }

    return this.triggerChartAppearance();
  }

  /**
   * Render stacked column of top growth account
   * @param {array} rawData
   * @param {array} itemsData
   */
  stackedColumnTopAccount(rawData, itemsData) {
    this.initialize();
    const seriesData = AMCData.get('seriesDataTopAccount', rawData);
    itemsData = AMCData.get('itemsDataTopAccount', itemsData);

    const chartOpts = this.chartOpts;
    const amc = this.getAmc(this.chartId, { chartOpts });
    const root = amc.createRoot({
      rootOpts: {
        tooltipContainerBounds: {
          top: 10,
          bottom: 10,
          right: 100,
          left: 100
        }
      },
    });
    const chart = amc.createXYChart(root, {
      paddingLeft: 10,
    });
    amc.setCursor(chart);

    const xAxisOpts = chartOpts.xAxis ? chartOpts.xAxis : { tooltip: {} };
    const xAxis = amc.setXDateAxis(chart);
    const yAxis = amc.setYAxis(chart);

    const cursorOpts = chartOpts.cursor ?? {};
    const tooltipOpts = cursorOpts.tooltip ?? {};
    delete tooltipOpts.labelText;
    const legendOpts = chartOpts.legend ?? {};
    const labelValueOpts = legendOpts.labelValue ?? {};
    const createSeries = (name, field, colorOpts) => {
      const series = chart.series.push(am5xy.ColumnSeries.new(root, {
        name,
        ...(colorOpts ? colorOpts : {}),
        stacked: true,
        xAxis: xAxis,
        yAxis: yAxis,
        valueYField: field,
        valueXField: `${xAxisOpts.categoryField}`,
        tooltip: am5.Tooltip.new(root, {
          labelText: "{name}: [bold]{valueY}[/]",
          ...tooltipOpts,
        }),
        ...(!labelValueOpts.visible
          ? { legendValueText: "" }
          : { legendValueText: amc.getLegendValueTextFormat() }),
        legendRangeValueText: "[{stroke}]{valueYClose}[/]"
      }))
      amc.setSeriesDataProcessor(series);
      series.data.setAll(seriesData);
      series.appear(AMCData.SERIES_FADE_IN);
    };
    itemsData.forEach((item) => {
      const setting = item.settings ?? null;
      const colorOpts = setting && setting.stroke
        ? {
          stroke: am5.color(setting.stroke),
          fill: am5.color(setting.fill ?? setting.stroke),
        }
        : undefined;
      createSeries(item.label, item.ch_key, colorOpts);
    });
    const legend = amc.setLegend();
    if (legend) {
      legend.data.setAll(chart.series.values);
      legend.appear(AMCData.SERIES_FADE_IN);
    }

    return this.triggerChartAppearance();
  }

  /**
   * Render stacked column of daily dist sentiment
   * @param {array} rawData
   */
  stackedColumnDailyDistSentiment(rawData) {
    this.initialize();
    const seriesData = AMCData.get('seriesDataDailyDistSentiment', rawData);
    const itemsData = AMCData.get('itemsDataDailyDistSentiment', rawData);

    const chartOpts = this.chartOpts;
    const amc = this.getAmc(this.chartId, { chartOpts });
    const root = amc.createRoot();
    const chart = amc.createXYChart(root, {
      paddingLeft: 10,
    });
    amc.setCursor(chart);

    const xAxisOpts = chartOpts.xAxis ? chartOpts.xAxis : {};
    const xAxis = amc.setXDateAxis(chart);

    /** @var {object|bool} */
    let minorDateFormats = xAxisOpts.minorDateFormats ?? null;
    minorDateFormats = [true, null].indexOf(minorDateFormats) !== -1
      ? {day: "dd/MM"}
      : (typeof minorDateFormats === "object" ? minorDateFormats : false);
    if (minorDateFormats) xAxis.set("minorDateFormats", minorDateFormats);

    const yAxis = amc.setYAxis(chart);

    const cursorOpts = chartOpts.cursor ?? {};
    const tooltipOpts = cursorOpts.tooltip ?? {};
    const legendOpts = chartOpts.legend ?? {};
    const labelValueOpts = legendOpts.labelValue ?? {};
    // Reusable series options for column and line
    const seriesOpts = {
      xAxis: xAxis,
      yAxis: yAxis,
      valueXField: `${xAxisOpts.categoryField}`,
      // legendLabelText: "[{stroke}]{name}[/]",
      // legendRangeLabelText: "[fontSize: 14px {stroke}]{name}[/]",
      // legendValueText: "[fontSize: 13px bold]{valueY}[/]",
      ...(!labelValueOpts.visible
        ? { legendValueText: "" }
        : { legendValueText: amc.getLegendValueTextFormat() }),
      legendRangeValueText: "[{stroke}]{valueYClose}[/]",
    };
    const createColumnSeries = (name, field, colorOpts) => {
      const series = chart.series.push(
        am5xy.ColumnSeries.new(root, {
          ...seriesOpts,
          ...{
            name,
            valueYField: field,
            stacked: true,
            tooltip: am5.Tooltip.new(root, { ...tooltipOpts }),
          },
          ...(colorOpts ? colorOpts : {}),
        }));
      amc.setSeriesDataProcessor(series);
      amc.setSeriesTemplate(series);
      return series;
    };

    const createLineSeries = (name, field, colorOpts) => {
      const series = chart.series.push(am5xy.LineSeries.new(root, {
        ...seriesOpts,
        ...{
          name,
          valueYField: field,
          tooltip: am5.Tooltip.new(root, { ...tooltipOpts }),
        },
        ...(colorOpts ? colorOpts : {}),
      }));
      amc.setSeriesTemplate(series);
      amc.setSeriesDataProcessor(series);
      amc.setBullets(series);
      return series;
    };

    const mapLabel = AMC.getMapLabel("sentimen");
    const sentimentKeys = Object.keys(mapLabel);
    itemsData.forEach((item) => {
      const ch_key = item.ch_key;
      const label = item.label;
      const setting = item.settings ?? null;
      const colorOpts = setting && setting.stroke
        ? {
          stroke: am5.color(setting.stroke),
          fill: am5.color(setting.fill ?? setting.stroke),
        }
        : undefined;
      const series = sentimentKeys.indexOf(ch_key) === -1
        ? createLineSeries(label, ch_key, colorOpts)
        : createColumnSeries(label, ch_key, colorOpts);
      series.data.setAll(seriesData);
      series.appear(AMCData.SERIES_FADE_IN);
    });
    amc.scaleBulletOnCursorMove(chart);
    const legend = amc.setLegend();
    if (legend) {
      legend.data.setAll(chart.series.values);
      legend.appear(AMCData.SERIES_FADE_IN);
    }

    return this.triggerChartAppearance();
  }

  /**
   * @deprecated
   * Render single column of daily dist
   * @param {array} rawData 
   */
  columnDailyDist(rawData) {
    this.initialize();
    const seriesData = AMCData.get('seriesDataDailyDistSentiment', rawData);
    const itemsData = AMCData.get('itemsDataDailyDistSentiment', rawData);

    const chartOpts = this.chartOpts;
    const amc = this.getAmc(this.chartId, { chartOpts });
    const root = amc.createRoot();
    const chart = amc.createXYChart(root, {
      paddingLeft: 10,
    });
    amc.setCursor(chart);

    const xAxisOpts = chartOpts.xAxis ? chartOpts.xAxis : {};
    const xAxis = amc.setXDateAxis(chart);
    const yAxis = amc.setYAxis(chart);

    const cursorOpts = chartOpts.cursor ?? {};
    const tooltipOpts = cursorOpts.tooltip ?? {};
    const legendOpts = chartOpts.legend ?? {};
    const labelValueOpts = legendOpts.labelValue ?? {};
    // Reusable series options for column and line
    const seriesOpts = {
      xAxis: xAxis,
      yAxis: yAxis,
      valueXField: `${xAxisOpts.categoryField}`,
      ...(!labelValueOpts.visible
        ? { legendValueText: "" }
        : { legendValueText: amc.getLegendValueTextFormat() }),
      legendRangeValueText: "[{stroke}]{valueYClose}[/]",
    };
    const createColumnSeries = (name, field, colorOpts) => {
      const series = chart.series.push(
        am5xy.ColumnSeries.new(root, {
          ...seriesOpts,
          ...{
            name,
            valueYField: field,
            stacked: true,
            tooltip: am5.Tooltip.new(root, { ...tooltipOpts }),
          },
          ...(colorOpts ? colorOpts : {}),
        }));
      amc.setSeriesDataProcessor(series);
      amc.setSeriesTemplate(series);
      return series;
    };

    itemsData.forEach((item) => {
      const ch_key = item.ch_key;
      const label = item.label;
      const setting = item.settings ?? null;
      const colorOpts = setting && setting.stroke
        ? {
          stroke: am5.color(setting.stroke),
          fill: am5.color(setting.fill ?? setting.stroke),
        }
        : undefined;
      const series = createColumnSeries(label, ch_key, colorOpts);
      series.data.setAll(seriesData);
      series.appear(AMCData.SERIES_FADE_IN);
    });
    amc.scaleBulletOnCursorMove(chart);
    const legend = amc.setLegend();
    if (legend) {
      legend.data.setAll(chart.series.values);
      legend.appear(AMCData.SERIES_FADE_IN);
    }

    return this.triggerChartAppearance();
  }

  /**
   * Render clustered column by specified metricField
  * @param {array} rawData
  * @param {string} metricField Default: doc_count
   */
  horizontalColumn(rawData, metricField='doc_count') {
    metricField = metricField ? metricField : 'doc_count';
    return this.horizontalColumnTopMetric(rawData, metricField);
  }

  /**
   * Render clustered column of top post sorted by specified metricField
   * @param {array} rawData
   * @param {string} metricField
   */
  horizontalColumnTopMetric(rawData, metricField) {
    this.initialize();
    const seriesData = AMCData.get(
      'seriesDataHorizontalColumnTopMetric', rawData, metricField);

    const chartOpts = this.chartOpts;
    const amc = this.getAmc(this.chartId, {chartOpts});
    const root = amc.createRoot();
    const chart = amc.createXYChart(root);

    const bulletYAxis = function (root, axis, dataItem) {
      const sprite = am5.Picture.new(root, {
        width: 32,
        height: 32,
        centerX: am5.percent(50),
        centerY: am5.percent(50),
        src: dataItem.dataContext.avatar,
      });

      const label = dataItem.get("label");

      // Moves icon to the left of the label
      label.events.on("boundschanged", function (e) {
        sprite.set("centerX", 32 + ((40-32)/2));
      });

      return am5xy.AxisBullet.new(root, {
        location: 0.5,
        sprite: sprite
      });
    };

    const yAxis = amc.setXCategoryAxis(chart, {
      categoryField: "category",
      renderer: am5xy.AxisRendererY.new(root, {
        inversed: true,
        cellStartLocation: 0.1,
        cellEndLocation: 0.9,
        minorGridEnabled: true,
      }),
      bullet: bulletYAxis,
    });
    yAxis.get("renderer").labels.template.setAll({
      oversizedBehavior: "wrap",
      textAlign: "right",
      paddingRight: 40,
      maxWidth: 320
    });
    yAxis.data.setAll(seriesData);

    const xAxis = amc.setYAxis(chart, {
      renderer: am5xy.AxisRendererX.new(root, {
        strokeOpacity: 0.1,
      }),
      extraMax: 0.05,
      min: 0
    });

    /**
     * Create horizontal column series
     * @param {string} field
     * @param {string} name
     * @param {?object} colorOpts
     * @returns {series}
     */
    function createSeries(field, name, colorOpts) {
      const series = chart.series.push(am5xy.ColumnSeries.new(root, {
        name: name,
        ...(colorOpts ? colorOpts : {}),
        xAxis: xAxis,
        yAxis: yAxis,
        valueXField: field,
        categoryYField: "category",
        sequencedInterpolation: true,
      }));

      series.columns.template.setAll({
        height: am5.p100,
        strokeOpacity: 1,
      });

      /**
       * @deprecated in future
       * fill and stroke color should be handled by supplied data_settings on data item
       */
      ["fill", "stroke"].forEach(it => {
        series.columns.template.adapters.add(it, function (color, target) {
          const dataContext = target.dataItem?.dataContext;
          const hasDataSettings = dataContext && "undefined" !== typeof dataContext?.data_settings;
          const colorValue = hasDataSettings
            ? dataContext?.data_settings[it]
            : dataContext?.color;
          return colorValue ? am5.color(colorValue) : color;
        });
      })

      const valueLabelsOpts = chartOpts.valueLabels ?? {};

      /** @type {boolean} */
      const showValueLabels = valueLabelsOpts.enabled ?? true;

      if (showValueLabels) {
        series.bullets.push(AMC.createAdaptiveLabelRenderer(chartOpts));
      }

      return series;
    }
    let seriesName = chartOpts.series?.name ?? '';
    seriesName = seriesName
      ? seriesName
      : AMC.ucfirst(`${metricField}`.replace('_', ' ').toLowerCase());

    const colorOpts = AMC.getSeriesColorFromOptions(chartOpts);
    const series = createSeries("value", seriesName, colorOpts);
    series.data.setAll(seriesData);
    series.appear(AMCData.SERIES_FADE_IN);

    const legend = amc.setLegend();
    if (legend) {
      legend.data.setAll(chart.series.values);      
      legend.appear(AMCData.SERIES_FADE_IN);
    }

    return this.triggerChartAppearance();
  }

  /**
   * Render clustered column of top review count
   * @param {array} rawData
   */
  horizontalColumnTopReviews(rawData) {
    this.initialize();
    const seriesData = AMCData.get(
      'seriesDataHorizontalColumnTopReviews', rawData);

    const hasAvatar = seriesData[0].avatar ? true : false;
    const chartOpts = this.chartOpts;
    const amc = this.getAmc(this.chartId, {chartOpts});
    const root = amc.createRoot();
    const chart = amc.createXYChart(root);

    const bulletYAxis = function (root, axis, dataItem) {
      const sprite = am5.Picture.new(root, {
        width: 32,
        height: 32,
        centerX: am5.percent(50),
        centerY: am5.percent(50),
        src: dataItem.dataContext.avatar,
      });

      const label = dataItem.get("label");

      // Moves icon to the left of the label
      label.events.on("boundschanged", function (e) {
        sprite.set("centerX", 32 + ((40-32)/2));
      });

      return am5xy.AxisBullet.new(root, {
        location: .5,
        sprite: sprite
      });
    };

    const yAxis = amc.setXCategoryAxis(chart, {
      categoryField: "category",
      renderer: am5xy.AxisRendererY.new(root, {
        inversed: true,
        cellStartLocation: 0.1,
        cellEndLocation: 0.9,
        minorGridEnabled: true,
      }),
      bullet: bulletYAxis,
    });
    yAxis.get("renderer").labels.template.setAll({
      oversizedBehavior: "wrap",
      textAlign: "right",
      paddingRight: hasAvatar ? 40 : 10,
      maxWidth: 320
    });
    yAxis.data.setAll(seriesData);

    const xAxis = amc.setYAxis(chart, {
      renderer: am5xy.AxisRendererX.new(root, {
        strokeOpacity: 0.1,
        minGridDistance: 50,
      }),
      extraMax: 0.05,
      min: 0
    });

    /**
     * Create horizontal column series
     * @param {string} field
     * @param {string} name
     * @returns {series}
     */
    function createSeries(field, name) {
      const series = chart.series.push(am5xy.ColumnSeries.new(root, {
        name: name,
        xAxis: xAxis,
        yAxis: yAxis,
        valueXField: field,
        categoryYField: "category",
        sequencedInterpolation: true,
      }));

      series.columns.template.setAll({
        height: am5.p100,
        strokeOpacity: 1
      });

      const valueLabelsOpts = chartOpts.valueLabels ?? {};

      /** @type {boolean} */
      const showValueLabels = valueLabelsOpts.enabled ?? true;

      if (showValueLabels) {
        series.bullets.push(AMC.createAdaptiveLabelRenderer(chartOpts));
      }

      return series;
    }
    const series = createSeries("value", "Reviews");
    series.data.setAll(seriesData);
    series.appear(AMCData.SERIES_FADE_IN);

    const legend = amc.setLegend();
    if (legend) {
      legend.data.setAll(chart.series.values);      
      legend.appear(AMCData.SERIES_FADE_IN);
    }

    return this.triggerChartAppearance();
  }

  /**
   * Render smooth line of hourly dist sentiment
   * @param {array} rawData
   * @param {object|string|null} dataType Data type: sentimen, bot, platform
   */
  smoothLineHourlyDistSentiment(rawData, dataType=null) {
    this.initialize();
    const seriesData = AMCData.get('seriesDataHourlyDistSentiment', rawData);
    const itemsData = AMCData.get('itemsDataHourlyDistSentiment', rawData, dataType);

    const chartOpts = this.chartOpts;
    const amc = this.getAmc(this.chartId, { chartOpts });
    const root = amc.createRoot();
    const chart = amc.createXYChart(root, {
      paddingLeft: 10,
    });
    amc.setCursor(chart);

    const xAxisOpts = chartOpts.xAxis ? chartOpts.xAxis : {};
    const xAxis = amc.setXDateAxis(chart);
    const periodChangeFormat = 'periodChangeDateFormats';
    xAxis.set(periodChangeFormat, {
      ...xAxis.get(periodChangeFormat),
      day: `[bold]dd MMM[/]`,
    });

    /** @var {object|bool} */
    let minorDateFormats = xAxisOpts.minorDateFormats ?? null;
    minorDateFormats = [true, null].indexOf(minorDateFormats) !== -1
      ? {hour: "HH", day: "dd/MM"}
      : (typeof minorDateFormats === "object" ? minorDateFormats : false);
    if (minorDateFormats) xAxis.set("minorDateFormats", minorDateFormats);

    const yAxis = amc.setYAxis(chart);

    const cursorOpts = chartOpts.cursor ?? {};
    const tooltipOpts = cursorOpts.tooltip ?? {};
    const legendOpts = chartOpts.legend ?? {};
    const labelValueOpts = legendOpts.labelValue ?? {};
    const createLineSeries = (name, field, colorOpts) => {
      const series = chart.series.push(am5xy.SmoothedXLineSeries.new(root, {
        name,
        ...(colorOpts ? colorOpts : {}),
        xAxis: xAxis,
        yAxis: yAxis,
        valueYField: field,
        valueXField: `${xAxisOpts.categoryField}`,
        tooltip: am5.Tooltip.new(root, { ...tooltipOpts }),
        // legendLabelText: "[{stroke}]{name}[/]",
        // legendRangeLabelText: "[fontSize: 14px {stroke}]{name}[/]",
        // legendValueText: "[fontSize: 13px bold]{valueY}[/]",
        ...(!labelValueOpts.visible
          ? { legendValueText: "" }
          : { legendValueText: amc.getLegendValueTextFormat() }),
        legendRangeValueText: "[{stroke}]{valueYClose}[/]",
      }));
      amc.setSeriesTemplate(series);
      amc.setSeriesDataProcessor(series);
      amc.setBullets(series, seriesData);
      return series;
    };
    itemsData.forEach((item) => {
      const setting = item.settings ?? null;
      const colorOpts = setting && setting.stroke
        ? {
          stroke: am5.color(setting.stroke),
          fill: am5.color(setting.fill ?? setting.stroke),
          ...(setting.opacity ? {fillOpacity: setting.opacity} : {}),
        }
        : undefined;
      const series = createLineSeries(item.label, item.ch_key, colorOpts);
      series.appear(AMCData.SERIES_FADE_IN);
    });
    // amc.scaleBulletOnCursorMove(chart);
    const legend = amc.setLegend();
    if (legend) {
      legend.data.setAll(chart.series.values);
      legend.appear(AMCData.SERIES_FADE_IN);
    }

    return this.triggerChartAppearance();
  }

  /**
   * Render smooth line or clustered column for Issues
   * @param {array} itemsData
   * @param {string} chType of: line, column
   */
  dailyDistIssues(itemsData, chType) {
    this.initialize();
    const seriesData = AMCData.get('seriesDataIssues', itemsData);
    itemsData = AMCData.get('itemsDataIssues', itemsData);
    chType = chType && ['line', 'column'].indexOf(chType) === -1
      ? 'line'
      : chType;

    const chartOpts = this.chartOpts;
    const amc = this.getAmc(this.chartId, { chartOpts });
    const root = amc.createRoot();
    const chart = amc.createXYChart(root, {
      paddingLeft: 10,
    });
    amc.setCursor(chart, { behavior: "none" });

    // Create axes
    const xAxisOpts = chartOpts.xAxis ? chartOpts.xAxis : {};
    const xAxis = amc.setXDateAxis(chart);

    /** @var {object|bool} */
    let minorDateFormats = xAxisOpts.minorDateFormats ?? null;
    minorDateFormats = [true, null].indexOf(minorDateFormats) !== -1
      ? { day: "dd/MM"}
      : (typeof minorDateFormats === "object" ? minorDateFormats : false);
    if (minorDateFormats) xAxis.set("minorDateFormats", minorDateFormats);

    const yAxis = amc.setYAxis(chart);

    const cursorOpts = chartOpts.cursor ?? {};
    const tooltipOpts = cursorOpts.tooltip ?? {};
    const createSeries = (name, field, colorOpts) => {
      const seriesChType = chType === 'line'
        ? 'SmoothedXLineSeries'
        : 'ColumnSeries';
      const series = chart.series.push(am5xy[seriesChType].new(root, {
        name,
        ...(colorOpts ? colorOpts : {}),
        xAxis: xAxis,
        yAxis: yAxis,
        valueYField: field,
        valueXField: `${xAxisOpts.categoryField}`,
        tooltip: am5.Tooltip.new(root, { ...tooltipOpts }),
        legendValueText: amc.getLegendValueTextFormat(),
        legendRangeValueText: "[{stroke}]{valueYClose}[/]"
      }));
      amc.setSeriesTemplate(series);
      amc.setSeriesDataProcessor(series);
      amc.setBullets(series, seriesData);
      return series;
    };
    itemsData.forEach(item => {
      const setting = item.settings ?? null;
      const colorOpts = setting && setting.stroke
        ? {
          stroke: am5.color(setting.stroke),
          fill: am5.color(setting.fill ?? setting.stroke),
        }
        : undefined;
      const series = createSeries(item.label, item.ch_key, colorOpts);
      series.appear(AMCData.SERIES_FADE_IN);
    });

    const legend = amc.setLegend();
    if (legend) {
      legend.data.setAll(chart.series.values);
      legend.appear(AMCData.SERIES_FADE_IN);
    }

    return this.triggerChartAppearance();
  }

  /**
   * Render Category Clustered Column
   * @param {array} rawData
   */
  categoryClusteredColumn(rawData) {
    this.initialize();
    const seriesData = AMCData.get('seriesDataClusteredColumn', rawData);
    const itemsData = AMCData.get('itemsDataClusteredColumn', rawData);

    const chartOpts = this.chartOpts;
    const amc = this.getAmc(this.chartId, {chartOpts});
    const root = amc.createRoot();
    const chart = amc.createXYChart(root, {
      paddingLeft: 10,
    });

    // // https://www.amcharts.com/docs/v5/charts/xy-chart/cursor/
    amc.setCursor(chart, { behavior: "none" });

    const xAxisOpts = chartOpts.xAxis ? chartOpts.xAxis : {};
    const xRenderer = am5xy.AxisRendererX.new(root, {
      cellStartLocation: .1,
      cellEndLocation: .9,
      enabled: false,
      minorGridEnabled: true
    });

    const xAxis = amc.setXCategoryAxis(chart, {
      renderer: xRenderer,
      categoryXField: `${xAxisOpts.categoryField}`,
    });
    xAxis.data.setAll(seriesData);

    const yAxis = amc.setYAxis(chart, {
      maxDeviation: 0.3,
      renderer: am5xy.AxisRendererY.new(root, {
        strokeOpacity: 0.1
      }),
    });

    const createSeries = (name, field) => {
      const series = chart.series.push(am5xy.ColumnSeries.new(root, {
        name,
        xAxis: xAxis,
        yAxis: yAxis,
        valueYField: field,
        categoryXField: `${xAxisOpts.categoryField}`,
        tooltip: am5.Tooltip.new(root, {
          labelText: "{name}: [bold]{valueY}[/]"
        }),
      }));
      amc.setSeriesTemplate(series);
      amc.setBullets(series, seriesData);
      series.columns.template.setAll({
        width: am5.percent(100),
      });

      series.appear(AMCData.SERIES_FADE_IN);

      const legend = amc.setLegend();
      if (legend) {
        legend.data.setAll(chart.series.values);
        legend.appear(AMCData.SERIES_FADE_IN);
      }

      return series;
    };

    itemsData.forEach((item) => {
      createSeries(item.label, item.ch_key);
    });

    return this.triggerChartAppearance();
  }

  /**
   * Render Category Vertical Column
   * @param {array} rawData
   */
  categoryVerticalColumn(rawData) {
    this.initialize();
    const seriesData = AMCData.get('seriesDataVerticalColumnCategory', rawData);

    const chartOpts = this.chartOpts;
    const amc = this.getAmc(this.chartId, {chartOpts});
    const root = amc.createRoot();
    const chart = amc.createXYChart(root);

    const xAxisOpts = chartOpts.xAxis ?? {};
    const xRenderer = am5xy.AxisRendererX.new(root, {
      minGridDistance: 0,
    });
    if (xAxisOpts.labelRotation) {
      xRenderer.labels.template.setAll({
        rotation: xAxisOpts.labelRotation,
        centerY: am5.p50,
        centerX: am5.p50,
      });
    }
    const xAxis = amc.setXCategoryAxis(chart, {
      renderer: xRenderer,
      categoryField: "category",
    });
    xAxis.data.setAll(seriesData);

    const yRenderer = am5xy.AxisRendererY.new(root, {
      strokeOpacity: 0.1
    })
    const yAxis = amc.setYAxis(chart, {
      renderer: yRenderer,
    });

    const seriesOpts = chartOpts.series ?? {};
    const name = seriesOpts.name ?? 'Total';

    const series = chart.series.push(am5xy.ColumnSeries.new(root, {
      name,
      xAxis: xAxis,
      yAxis: yAxis,
      valueYField: "value",
      categoryXField: "category",
      sequencedInterpolation: true,
      tooltip: am5.Tooltip.new(root, {
        labelText: "{valueY}"
      })
    }));

    const valueLabelsOpts = chartOpts.valueLabels ?? {};

    /** @type {boolean} */
    const showValueLabels = valueLabelsOpts.enabled ?? true;

    if (showValueLabels) {
      series.bullets.push(AMC.createAdaptiveLabelRenderer(chartOpts, 'vertical'));
    }

    series.data.setAll(seriesData);
    series.appear(AMCData.SERIES_FADE_IN);

    const legend = amc.setLegend();
    if (legend) {
      legend.data.setAll(chart.series.values);
      legend.appear(AMCData.SERIES_FADE_IN);
    }

    return this.triggerChartAppearance();
  }

  /**
   * Render Vertical Clustered Column
   * @param {array} rawData
   */
  verticalClusteredColumn(rawData) {
    this.initialize();
    const seriesData = AMCData.get('seriesDataVerticalClusteredColumn', rawData);
    const itemsData = AMCData.get('itemsDataVerticalClusteredColumn', rawData);

    const chartOpts = this.chartOpts;
    const amc = this.getAmc(this.chartId, {chartOpts});
    const root = amc.createRoot();
    const chart = amc.createXYChart(root, {
      paddingLeft: 10,
    });
    amc.setCursor(chart, { behavior: "none" });

    const xAxisOpts = chartOpts.xAxis ?? {};
    const isDateXAxis = !!(xAxisOpts.isDateAxis ?? false);
    const cursorOpts = chartOpts.cursor ?? {};
    const isCursorEnabled = !!(cursorOpts.enabled ?? true);
    const xRenderer = am5xy.AxisRendererX.new(root, {
      cellStartLocation: .1,
      cellEndLocation: .9,
      minorGridEnabled: true
    });
    const xAxis = isDateXAxis
      ? amc.setXDateAxis(chart, {
          renderer: xRenderer,
        })
      : amc.setXCategoryAxis(chart, {
          renderer: xRenderer,
          categoryXField: `${xAxisOpts.categoryField}`,
        });
    xAxis.data.setAll(seriesData);

    const yAxis = amc.setYAxis(chart, {
      maxDeviation: 0.3,
      renderer: am5xy.AxisRendererY.new(root, {
        strokeOpacity: 0.1
      }),
    });

    const createSeries = (name, field) => {
      const series = chart.series.push(am5xy.ColumnSeries.new(root, {
        name,
        xAxis: xAxis,
        yAxis: yAxis,
        valueYField: field,
        tooltip: am5.Tooltip.new(root, {
          labelText: "{name}: [bold]{valueY}[/]"
        }),
        ...(isDateXAxis
          ? {valueXField: xAxisOpts.categoryField ?? "date"}
          : {categoryXField: `${xAxisOpts.categoryField}`}),
        clustered: true,
      }));
      amc.setSeriesTemplate(series);
      if (isDateXAxis) amc.setSeriesDataProcessor(series);
      amc.setBullets(series, seriesData);
      const valueXPlaceholder = isDateXAxis
        ? "valueX.formatDate('dd MMM, yyyy')"
        : "categoryX";
      const tooltipText = isCursorEnabled
        ? `{name} on {${valueXPlaceholder}}:{valueY}`
        : undefined;
      let columnGap = xAxisOpts.columnGap ? parseInt(xAxisOpts.columnGap) : 0;
      columnGap = columnGap < 0 || columnGap > 100 ? 0 : columnGap;
      series.columns.template.setAll({
        tooltipText,
        tooltipY: 0,
        width: am5.percent(100 - columnGap),
      });

      series.appear(AMCData.SERIES_FADE_IN);

      return series;
    };
    itemsData.forEach(item => createSeries(item.label, item.ch_key));

    const legend = amc.setLegend();
    if (legend) {
      legend.data.setAll(chart.series.values);
      legend.appear(AMCData.SERIES_FADE_IN);
    }

    return this.triggerChartAppearance();
  }

  /**
   * Render smooth line of issues thumbnail
   * @param {array} rawData
   * @param {string} datatype Default: platform
   */
  smoothLineIssuesTumbnail(rawData, datatype='platform') {
    datatype = datatype ? datatype : 'platform';
    return this.smoothLineHourlyDistSentiment(rawData, datatype);
  }

  /**
   * @deprecated @see pieChart()
   * Render donut chart of popular sentiment
   * @param {array} rawData
   */
  donutPopularData(rawData, metafield) {
    this.initialize();
    const seriesData = AMCData.get(
      'seriesDataPopular', rawData, metafield);

    const chartOpts = this.chartOpts;
    const onClick = "function" === typeof chartOpts.onclick
      ? chartOpts.onclick
      : undefined;
    const amc = this.getAmc(this.chartId, { chartOpts });
    const root = amc.createRoot({
      rootOpts: {
        marginBottom: "1rem"
      },
    });
    root.container.set("layout", root.verticalLayout);
    const chart = amc.createPieChart(root);

    const legendOpts = chartOpts.legend ?? {};
    const labelValueOpts = legendOpts.labelValue ?? {};

    const textValues = [];

    const percentFormater = 'valuePercentTotal.formatNumber';
    const percentDetail = '0.0';
    const mapLabels = {
      category: "{category}",
      percentage: `{${percentFormater}('${percentDetail}')}%`,
      value: "({value})",
    };
    /** @type {object} */
    const labelsOpts = chartOpts.labels ?? {};

    /** @type {array} */
    const tooltipLabels = labelsOpts.tooltip ?? [];
    if (!tooltipLabels.length)
      Object.keys(mapLabels).forEach(it => tooltipLabels.push(it));

    if (tooltipLabels.length) {
      tooltipLabels.forEach(it => {
        const val = mapLabels[it] ?? '';
        if (val) textValues.push(val);
      });
    }

    const cursorOpts = chartOpts.cursor ?? { enabled: true };
    const cursorEnabled = cursorOpts.enabled ?? true;

    const series = chart.series.push(
      am5percent.PieSeries.new(root, {
        valueField: `${chartOpts.valueField}`,
        categoryField: `${chartOpts.categoryField}`,
        endAngle: 270,
        alignLabels: labelsOpts.aligned,
        ...(chartOpts.radius ? { radius: am5.percent(chartOpts.radius) } : {}),
        ...(cursorEnabled
            ? {tooltip: am5.Tooltip.new(root, {labelText: textValues.join(" ")})}
            : {}),
        ...(!labelValueOpts.visible ? { legendValueText: "" } : {}),
      }));

    let inputText = labelsOpts.text ?? '';
    if (inputText) {
      // E.g. {percentage:0.0}
      const textRegex = /{(percentage)(?:\:([^\}]+))?}/;
      inputText = inputText.replace(textRegex, (S, $1, $2) => {
        $2 = "undefined" !== typeof $2 ? $2 : percentDetail;
        return `{${percentFormater}('${$2}')}%`;
      });
    }
    else {
      /** @type {array} */
      const inlineLabels = labelsOpts.inline ?? [];

      if (inlineLabels.length) {
        textValues.length = 0;
        inlineLabels.forEach(it => {
          const val = mapLabels[it] ?? '';
          if (val) textValues.push(val);
        });
      }
      inputText = textValues.join(labelsOpts.inlineText ? ' ' : '\n');
    }
    series.labels.template.setAll({
      ...labelsOpts,
      text: inputText
    });
    series.states.create("hidden", { endAngle: -90 });

    series.slices.template.setAll({
      templateField: "settings",
      cursorOverStyle: onClick ? "pointer" : "default",
      ...(!cursorEnabled ? { tooltipText: "" } : {}),
    });
    if (onClick) {
      series.slices.template.events.on("pointerdown", function (e) {
        onClick(e);
      });
    }

    const hoverScale = !cursorEnabled ? 1 : (chartOpts.hoverScale ?? null);
    const activeShiftRadius = !cursorEnabled
      ? 0
      : (chartOpts.activeShiftRadius ?? null);
    series.slices.template.states.create("hover", {scale: hoverScale});
    series.slices.template.states.create("active", {
      shiftRadius: activeShiftRadius
    });
    if (!cursorEnabled) series.slices.template.set("toggleKey", "none");

    series.data.setAll(seriesData);

    const legend = amc.setLegend();
    if (legend) legend.data.setAll(series.dataItems);

    this.triggerAppearanceOf(series);

    return chart;
  }

  /**
   * Render donut chart of popular bot
   * An alias for donutPopularData
   * @param {array} rawData
   */
  donutPopularSentiment(rawData, metafield) {
    // return this.donutPopularData(rawData, metafield);
    return this.pieChart(rawData, metafield);
  }

  /**
   * Render donut chart of popular bot
   * An alias for donutPopularData
   * @param {array} rawData
   */
  donutPopularBot(rawData, metafield) {
    // return this.donutPopularData(rawData, metafield);
    return this.pieChart(rawData, metafield);
  }

  /**
   * Render donut chart of popular media
   * An alias for donutPopularData
   * @param {array} rawData
   */
  donutPopularMedia(rawData, metafield) {
    // return this.donutPopularData(rawData, metafield);
    return this.pieChart(rawData, metafield);
  }

  /**
   * Render pie/donut chart
   * @param {array} rawData
   * @param {string} metaField
   */
  pieChart(rawData, metaField) {
    this.initialize();
    const chartOpts = this.chartOpts;

    metaField = metaField ? metaField : (chartOpts.metaField ?? '');
    const seriesData = AMCData.get(
      'seriesDataPieChart', rawData, metaField);

    const onClick = "function" === typeof chartOpts.onclick
      ? chartOpts.onclick
      : undefined;
    const amc = this.getAmc(this.chartId, { chartOpts });
    const root = amc.createRoot({
      rootOpts: {
        marginBottom: "1rem"
      },
    });
    root.container.set("layout", root.verticalLayout);
    const chart = amc.createPieChart(root);

    const legendOpts = chartOpts.legend ?? {};
    const labelValueOpts = legendOpts.labelValue ?? {};

    const textValues = [];

    const percentFormater = 'valuePercentTotal.formatNumber';
    const percentDetail = '0.0';
    const mapLabels = {
      category: "{category}",
      percentage: `{${percentFormater}('${percentDetail}')}%`,
      value: "({value})",
    };
    /** @type {object} */
    const labelsOpts = chartOpts.labels ?? {};

    /** @type {array} */
    const tooltipLabelFields = labelsOpts.tooltipLabelFields ?? [];
    if (!tooltipLabelFields.length)
      Object.keys(mapLabels).forEach(it => tooltipLabelFields.push(it));

    if (tooltipLabelFields.length) {
      tooltipLabelFields.forEach(it => {
        const val = mapLabels[it] ?? '';
        if (val) textValues.push(val);
      });
    }

    const cursorOpts = chartOpts.cursor ?? { enabled: true };
    const cursorEnabled = cursorOpts.enabled ?? true;

    const series = chart.series.push(
      am5percent.PieSeries.new(root, {
        valueField: `${chartOpts.valueField}`,
        categoryField: `${chartOpts.categoryField}`,
        endAngle: 270,
        ...(chartOpts.radius ? { radius: am5.percent(chartOpts.radius) } : {}),
        alignLabels: labelsOpts.aligned,
        ...(cursorEnabled
          ? { tooltip: am5.Tooltip.new(root, {labelText: textValues.join(" ")}) }
          : {}),
        ...(!labelValueOpts.visible ? { legendValueText: "" } : {}),
      }));

    let customText = labelsOpts.customText ?? '';
    if (customText) {
      // E.g. {percentage:0.0}
      const textRegex = /{(percentage)(?:\:([^\}]+))?}/;
      customText = customText.replace(textRegex, (S, $1, $2) => {
        $2 = "undefined" !== typeof $2 ? $2 : percentDetail;
        return `{${percentFormater}('${$2}')}%`;
      });
    }
    else {
      /** @type {array} */
      const inlineLabelFields = labelsOpts.inlineLabelFields ?? [];

      if (inlineLabelFields.length) {
        textValues.length = 0;
        inlineLabelFields.forEach(it => {
          const val = mapLabels[it] ?? '';
          if (val) textValues.push(val);
        });
      }
      customText = textValues.join(labelsOpts.inlineText ? ' ' : '\n');
    }
    series.labels.template.setAll({
      ...labelsOpts,
      text: customText
    });
    series.states.create("hidden", { endAngle: -90 });

    series.slices.template.setAll({
      templateField: "settings",
      cursorOverStyle: (onClick && cursorEnabled) ? "pointer" : "default",
      ...(!cursorEnabled ? { tooltipText: "" } : {}),
    });
    if (onClick && cursorEnabled) {
      series.slices.template.events.on("pointerdown", function (e) {
        onClick(e);
      });
    }

    if (cursorEnabled) {
      const hoverScale = chartOpts.hoverScale ?? undefined;
      const activeShiftRadius = chartOpts.activeShiftRadius ?? undefined;
      if (hoverScale)
        series.slices.template.states.create("hover", {scale: hoverScale});

      if (activeShiftRadius) {
        series.slices.template.states.create("active", {
          shiftRadius: activeShiftRadius
        });
      }
    }
    else series.slices.template.set("toggleKey", "none");

    series.data.setAll(seriesData);

    const legend = amc.setLegend();
    if (legend) legend.data.setAll(series.dataItems);

    this.triggerAppearanceOf(series);

    return chart;
  }

  /**
   * Render radar area chart of popular emotion
   * @param {array} rawData
   */
  radarAreaPopularEmotion(rawData, metafield) {
    this.initialize();
    const seriesData = AMCData.get(
      'seriesDataPopularEmotion', rawData, metafield);

    const chartOpts = this.chartOpts;
    const amc = this.getAmc(this.chartId, { chartOpts });
    const root = amc.createRoot();
    const chart = amc.createRadarChart(root, {
      radius: chartOpts.chartRadius,
    });
    chart.set("cursor", am5radar.RadarCursor.new(root, {}));
    amc.setCursor(chart);

    const xRenderer = am5radar.AxisRendererCircular.new(root, {
      minGridDistance: 30
    });
    xRenderer.labels.template.setAll({
      centerY: am5.p50,
      ...(chartOpts.labels ?? {}),
    });
    xRenderer.grid.template.setAll({
      location: 0.5,
      strokeDasharray: [3, 3]
    });

    const xAxis = amc.setXCategoryAxis(chart, {
      renderer: xRenderer,
    });

    const yRenderer = am5radar.AxisRendererRadial.new(root, {
      minGridDistance: 30
    });
    yRenderer.grid.template.setAll({
      strokeDasharray: [2, 3]
    });
    const yAxis = amc.setYAxis(chart, {
      renderer: yRenderer,
    });
    const isPercent = (chartOpts.valueType ?? "number") === "percentage";
    const valueFormat = isPercent ? ".formatNumber('0.00')" : '';
    const valueUnit = isPercent ? '%' : '';
    const labelText = `{category}: [bold]{valueY${valueFormat}}${valueUnit}[/]`;
    const seriesOpts = chartOpts.series ?? {};
    const name = seriesOpts.name || 'Total';

    const series = chart.series.push(am5radar.RadarLineSeries.new(root, {
      name,
      xAxis: xAxis,
      yAxis: yAxis,
      valueYField: `${chartOpts.valueField}`,
      categoryXField: `${chartOpts.categoryField}`,
      tooltip: am5.Tooltip.new(root, {
        labelText,
      })
    }));
    amc.setSeriesTemplate(series);

    amc.setBullets(series, seriesData, chart);
    series.data.setAll(seriesData);
    xAxis.data.setAll(seriesData);
    series.appear(AMCData.SERIES_FADE_IN);

    return this.triggerChartAppearance();
  }

  /**
   * Deprecated! Due to inconsistency data (in %) but not 100% in accumulated.
   * Render variable radius chart of popular emotion
   * @param {array} rawData
   */
  radiusPiePopularEmotion(rawData, metafield) {
    this.initialize();
    const seriesData = AMCData.get(
      'seriesDataPopularEmotion', rawData, metafield);

    const chartOpts = this.chartOpts;
    const onClick = "function" === typeof chartOpts.onclick
      ? chartOpts.onclick
      : undefined;
    const amc = this.getAmc(this.chartId, { chartOpts });
    const root = amc.createRoot({
      rootOpts: {
        marginBottom: "1rem",
      },
    });
    root.container.set("layout", root.verticalLayout);
    const chart = amc.createPieChart(root);

    const legendOpts = chartOpts.legend ?? {};
    const labelValueOpts = legendOpts.labelValue ?? {};
    const labelText = [
      "{category}:",
      "{valuePercentTotal.formatNumber('0.00')}%",
      "({value})",
    ];
    const series = chart.series.push(
      am5percent.PieSeries.new(root, {
        alignLabels: true,
        calculateAggregates: true,
        valueField: `${chartOpts.valueField}`,
        categoryField: `${chartOpts.categoryField}`,
        endAngle: 270,
        tooltip: am5.Tooltip.new(root, {
          labelText: labelText.join(" "),
        }),
        ...(!labelValueOpts.visible
          ? { legendValueText: "" }
          : {}),
      }));
    labelText.pop();
    series.labels.template.set("text", labelText.join(" "));
    series.states.create("hidden", { endAngle: -90 });
    const sliceDefaults = {
      strokeWidth: 3,
      stroke: "#ffffff",
    };
    const slicesOpts = {
      ...sliceDefaults,
      ...(chartOpts.slices ?? {})
    };
    const sliceTemplate = series.slices.template;
    sliceTemplate.setAll({
      templateField: "settings",
      cursorOverStyle: onClick ? "pointer" : "default",
      strokeWidth: slicesOpts.strokeWidth,
      stroke: AMC.amColor(slicesOpts.stroke, am5.color(0xffffff)),
    });
    if (onClick) {
      sliceTemplate.events.on("pointerdown", function (e) {
        onClick(e);
      });
    }
    // series.labelsContainer.set("paddingTop", 30)

    // Set up adapters for variable slice radius
    // https://www.amcharts.com/docs/v5/concepts/settings/adapters/
    series.slices.template.adapters.add("radius", function (radius, target) {
      const dataItem = target.dataItem;
      const value = dataItem
        ? target.dataItem.get("valueWorking", 0)
        : 0;
      return dataItem
        ? radius * value / series.getPrivate("valueHigh")
        : radius;
    });
    series.data.setAll(seriesData);

    const legend = amc.setLegend();
    if (legend) legend.data.setAll(series.dataItems);

    return this.triggerChartAppearance();
  }

  /**
   * Render wordcloud
   * @param {array} rawData
   */
  wordcloud(rawData) {
    this.initialize();

    const chartOpts = this.chartOpts;
    const wcOpts = chartOpts.wordcloud ?? {};

    const seriesData = AMCData.get('seriesDataWordcloud', rawData, wcOpts);

    const amc = this.getAmc(this.chartId, { chartOpts });
    const root = amc.createRoot();

    const container = amc.getOrCreateZoomableContainer(root);
    const series = container.children.push(amc.createWordCloud(root));

    amc.setWordCloudLabel(series);

    series.data.setAll(seriesData);

    this.triggerAppearanceOf(series);
  }

  /**
   * Render column or line chart of daily dist buzz
   * @param {array} rawData
   * @param {string} seriesType of ["line", "column"]. Default: line
   */
  dailyDistBuzz(rawData, seriesType) {
    this.initialize();
    const seriesData = AMCData.get('seriesDataDailyDist', rawData);
    console.log('in dailyDistBuzz, rawData=', JSON.stringify(rawData), 'seriesData', seriesData);

    const chartOpts = this.chartOpts;
    const amc = this.getAmc(this.chartId, { chartOpts });
    const root = amc.createRoot();
    const chart = amc.createXYChart(root, {
      paddingLeft: 10,
    });
    amc.setCursor(chart, { behavior: "zoomX" });

    const xAxisOpts = chartOpts.xAxis ? chartOpts.xAxis : {};
    const xAxis = amc.setXDateAxis(chart);
    const yAxis = amc.setYAxis(chart);

    /** @var {object|bool} */
    let minorDateFormats = xAxisOpts.minorDateFormats ?? null;
    minorDateFormats = [true, null].indexOf(minorDateFormats) !== -1
      ? {day: "dd/MM"}
      : (typeof minorDateFormats === "object" ? minorDateFormats : false);
    if (minorDateFormats) xAxis.set("minorDateFormats", minorDateFormats);

    const cursorOpts = chartOpts.cursor ?? {};
    const tooltipOpts = cursorOpts.tooltip ?? {};
    const legendOpts = chartOpts.legend ?? {};
    const seriesOpts = chartOpts.series ?? {};
    const labelValueOpts = legendOpts.labelValue ?? {};

    const seriesParams = {
      xAxis: xAxis,
      yAxis: yAxis,
      valueXField: `${xAxisOpts.categoryField}`,
      ...(!labelValueOpts.visible
        ? { legendValueText: "" }
        : { legendValueText: amc.getLegendValueTextFormat() }),
      legendRangeValueText: "[{stroke}]{valueYClose}[/]",
    };
    seriesType = seriesType || seriesOpts.type || 'line';
    const isLineSeries = seriesType === 'line';
    const xySeriesType = isLineSeries ? am5xy.LineSeries : am5xy.ColumnSeries;
    const seriesName = seriesOpts.name || 'Total';
    const series = chart.series.push(xySeriesType.new(root, {
      ...seriesParams,
      name: seriesName,
      valueYField: `${chartOpts.yAxis.valueYField}`,
      tooltip: am5.Tooltip.new(root, {
        ...tooltipOpts,
        labelText: "[bold]{valueY}[/]",
      }),
    }));
    amc.setSeriesTemplate(series);
    amc.setSeriesDataProcessor(series);

    if (isLineSeries) amc.setBullets(series, seriesData);
    else series.data.setAll(seriesData);

    series.appear(AMCData.SERIES_FADE_IN);
    const legend = amc.setLegend();
    if (legend) {
      legend.data.setAll(chart.series.values);
      legend.appear(AMCData.SERIES_FADE_IN);
    }

    return this.triggerChartAppearance();
  }

  /**
   * Render line (micro) chart of popular hours
   * @param {array} rawData
   */
  lineMicroPopularHour(rawData) {
    this.initialize();
    const seriesData = AMCData.get('seriesDataPopularHour', rawData);

    const chartOpts = this.chartOpts;
    const amc = this.getAmc(this.chartId, { chartOpts });
    const root = amc.createRoot();
    const chart = amc.createXYChart(root, {
      padding: 0,
      paddingTop: 0,
      paddingRight: 0,
      paddingBottom: -20,
      paddingLeft: -10,
    });

    const xAxisOpts = chartOpts.xAxis ? chartOpts.xAxis : { tooltip: {} };
    const xRenderer = am5xy.AxisRendererX.new(root, {
      minorGridEnabled: false,
    });
    xRenderer.labels.template.set('visible', false);
    const xAxisParams = {
      categoryField: `${xAxisOpts.categoryField}`,
      renderer: xRenderer,
    };
    const xAxis = chart.xAxes.push(am5xy.CategoryAxis.new(root, xAxisParams));

    const yRenderer = am5xy.AxisRendererY.new(root, {});
    yRenderer.labels.template.set('visible', false);
    const yAxis = chart.yAxes.push(am5xy.ValueAxis.new(root, {
      renderer: yRenderer,
    }));
    const seriesOpts = chartOpts.series ?? {};
    const name = seriesOpts.name || 'Total';

    const series = chart.series.push(am5xy.LineSeries.new(root, {
      name,
      xAxis: xAxis,
      yAxis: yAxis,
      valueYField: `${chartOpts.yAxis.valueYField}`,
      categoryXField: `${xAxisOpts.categoryField}`,
    }));
    amc.setSeriesTemplate(series);

    [xAxis, series].forEach(obj => obj.data.setAll(seriesData));

    // Show bullets only on first max value
    let maxValue = 0;
    let maxValueSet = false;
    am5.array.each(series.dataItems, function (dataItem) {
      const context = dataItem.dataContext ?? {};
      if (context.value >= maxValue) maxValue = context.value;
    });

    series.bullets.push(function (event, chart, dataItem) {
      const context = dataItem.dataContext ?? {};
      if (!maxValueSet && maxValue && context.value >= maxValue) {
        maxValueSet = true;
        const shapeOpts = {
          centerX: am5.percent(50),
          centerY: am5.percent(50),
          fill: series.get("fill"),
          radius: 3,
        };
        return am5.Bullet.new(root, {
          sprite: am5.Circle.new(root, shapeOpts),
        });
      }
    });
    series.appear(AMCData.SERIES_FADE_IN);

    return this.triggerChartAppearance();
  }

  /**
   * Render single column of popular hours
   * @param {array} rawData
   */
  columnPopularHour(rawData) {
    this.initialize();
    const seriesData = AMCData.get('seriesDataPopularHour', rawData);

    const chartOpts = this.chartOpts;
    const amc = this.getAmc(this.chartId, { chartOpts });
    const root = amc.createRoot();
    const chart = amc.createXYChart(root);
    amc.setCursor(chart);

    const xAxisOpts = chartOpts.xAxis ? chartOpts.xAxis : { tooltip: {} };
    const xAxis = amc.setXCategoryAxis(chart, {
      maxDeviation: 0.3,
    });
    const yAxis = amc.setYAxis(chart, {
      maxDeviation: 0.3,
      renderer: am5xy.AxisRendererY.new(root, {
        strokeOpacity: 0.1
      }),
    });

    const cursorOpts = chartOpts.cursor ?? {};
    const tooltipOpts = cursorOpts.tooltip ?? {};
    const series = chart.series.push(am5xy.ColumnSeries.new(root, {
      xAxis: xAxis,
      yAxis: yAxis,
      valueYField: `${chartOpts.yAxis.valueYField}`,
      categoryXField: `${xAxisOpts.categoryField}`,
      sequencedInterpolation: true,
      tooltip: am5.Tooltip.new(root, {
        ...tooltipOpts,
        labelText: "{valueY}",
      }),
    }));
    const seriesOpts = chartOpts.series ?? {};
    const seriesColumnOpts = seriesOpts.columns ?? {
      fillOpacity: .3,
      strokeOpacity: .6,
    };
    amc.setSeriesTemplate(series, {
      columns: { ...seriesColumnOpts },
    });
    [xAxis, series].forEach(obj => obj.data.setAll(seriesData));
    amc.setBulletLabelOnMaxValue(series);

    series.appear(AMCData.SERIES_FADE_IN);

    return this.triggerChartAppearance();
  }

  /**
   * Render smooth line of daily dist popular media
   * @param {array} rawData
   */
  smoothLineDailyDistPopularMedia(rawData) {
    this.initialize();
    const seriesData = AMCData.get('seriesDataDailyDistPopularMedia', rawData);
    const itemsData = rawData.map((item) => {
      return {
        label: item.media,
        ch_key: item.media,
      }
    });

    const chartOpts = this.chartOpts;
    const amc = this.getAmc(this.chartId, { chartOpts });
    const root = amc.createRoot();
    const chart = amc.createXYChart(root);
    amc.setCursor(chart, { behavior: "zoomX" });

    // Create axes
    const xAxisOpts = chartOpts.xAxis ? chartOpts.xAxis : {};
    const xAxis = amc.setXDateAxis(chart);

    /** @var {object|bool} */
    let minorDateFormats = xAxisOpts.minorDateFormats ?? null;
    minorDateFormats = [true, null].indexOf(minorDateFormats) !== -1
      ? {day: "dd/MM"}
      : (typeof minorDateFormats === "object" ? minorDateFormats : false);
    if (minorDateFormats) xAxis.set("minorDateFormats", minorDateFormats);

    const yAxis = amc.setYAxis(chart);

    const cursorOpts = chartOpts.cursor ?? {};
    const tooltipOpts = cursorOpts.tooltip ?? {};
    const legendOpts = chartOpts.legend ?? {};
    const labelValueOpts = legendOpts.labelValue ?? {};
    const createSeries = (name, field) => {
      const series = chart.series.push(am5xy.SmoothedXLineSeries.new(root, {
        name,
        xAxis: xAxis,
        yAxis: yAxis,
        valueYField: field,
        valueXField: `${xAxisOpts.categoryField}`,
        tooltip: am5.Tooltip.new(root, { ...tooltipOpts }),
        ...(!labelValueOpts.visible
          ? { legendValueText: "" }
          : { legendValueText: amc.getLegendValueTextFormat() }),
        legendRangeValueText: "[{stroke}]{valueYClose}[/]",
      }));
      amc.setSeriesTemplate(series);
      amc.setSeriesDataProcessor(series);
      amc.setBullets(series, seriesData);
      return series;
    };
    itemsData.forEach((item) => {
      const setting = item.settings ?? null;
      const colorOpts = setting && setting.stroke
        ? {
          stroke: am5.color(setting.stroke),
          fill: am5.color(setting.fill ?? setting.stroke),
        }
        : undefined;
      const series = createSeries(item.label, item.ch_key, colorOpts);
      series.appear(AMCData.SERIES_FADE_IN);
    });
    const legend = amc.setLegend();
    if (legend) {
      legend.data.setAll(chart.series.values);
      legend.appear(AMCData.SERIES_FADE_IN);
    }

    return this.triggerChartAppearance();
  }
};
// end: AMCHandler

/**
 * AmChart Data Transformer
 */
class AMCData {
  // @see https://www.amcharts.com/docs/v5/concepts/animations/#Timing_appearance
  /** @var {int} ~ Fade in & delay (milliseconds) */
  SERIES_FADE_IN = 500;
  SERIES_DELAY = 0;

  CHART_FADE_IN = 1000;
  CHART_DELAY = 100;

  /**
   * Get transformed data of given method and data
   * @param {string} method
   * @param {array|object} data
   * @param {mixed} mixed
   * @return {array|object}
   */
  static get(method, data, mixed) {
    const self = new AMCData();
    if (typeof self[method] === "function")
      return self[method](data, mixed);
    else {
      console.error(`AMCData: method not found: ${method}`);
    }
  }

  /**
   * Build item data of given item, index, colors
   * @param {object} item
   * @param {int} index
   * @param {?array} colors
   * @return {object} of:
   * {
   *   ...,
   *   ?settings: {object},
   * }
   */
  static buildItemData(item, index, colors) {
    const newItem = { ...item };
    const hasColor = "undefined" !== typeof newItem.color && newItem.color;

    /** @var {string} */
    let icolor = (hasColor ? newItem.color : "").trim();

    /** @var {bool} */
    const isRgb = /^rgba?\b/.test(icolor);

    /** @var {bool} */
    const isHexish = icolor && !/^\#/.test(icolor) &&
      [3, 6].indexOf(icolor.length);

    icolor = !isRgb && isHexish ? `#${icolor}` : icolor;

    /** @var {string|null} */
    const color = icolor
      ? icolor
      : (colors && colors.length ? colors[index % colors.length] : null);

    if (color) {
      /** @var {float|null} */
      const opacity = color && isRgb
        ? (parseFloat(color.split(',')[3]) || 1)
        : null;

      newItem.settings = {
        stroke: color,
        fill: color,
        opacity,
      };
    }
    return newItem;
  }

  /**
   * Parse data_settings on item
   * @param {object} item
   * @returns {object}
   */
  static parseItemDataSettings(item) {
    if (item.data_settings || item.color) {
      item.data_settings = item.data_settings ?? {};

      ['fill', 'stroke'].forEach(it => {
        const itemColor = item.data_settings[it] ?? item.color ?? null;
        if (!itemColor) return !0;

        const parsedColor = AMC.parseColorAndOpacity(itemColor);
        if (!parsedColor) return !0;

        item.data_settings[it] = parsedColor.color;

        const opacityKey = `${it}Opacity`;

        /** @type {number|null} */
        const opacityInput = (() => {
          let value = item.data_settings[opacityKey] ?? null;
          value = parseFloat(value);
          if (isNaN(value)) return null;

          return value < 0 ? 0 : (value > 1 ? 1 : value);
        })();

        item.data_settings[opacityKey] = opacityInput === null
          ? parsedColor.opacity ?? 1
          : opacityInput;
      });
    }

    return item;
  }

  /**
   * Get options of given type
   * @param {string} type of: ["xy", "wordcloud"]
   * @param {?object} opts of:
   * {
   *   xCategoryType: {string}, of: ["category", "date"]
   *   excludes: {array},
   *   merge: {object}, of: [PieObject, XYObject, WCObject]
   * }
   * @object opts.merge<{PieObject}>
      {
        legend: {object},
        categoryField: "date",
        valueField: "value",
        innerRadius: 30,
        onclick: () => {},
      }
   * @object opts.merge<{XYObject}>
      {
        legend: {object},
        cursor: {
          enabled: true,
          behavior: "none",
          visible: {
            lineX: true,
            lineY: false,
          },
          tooltip: {
            enabled: true,
            pointerOrientation: "horizontal"
          },
        },
        bullets: {
          enabled: true, // Default: true
          shape: "square", // circle,square. Default: square
          size: 3, // Default: 4
          hoverScale: 1.2, // Default: 3
        },
        series: {
          strokes: {
            strokeWidth: 2,
          },
          fills: {
            visible: true,
            fillOpacity: 0.1,
          },
        },
        xAxis: {
          categoryField: "date",
          inputDateFormat: "yyyy-MM-dd",
          categoryDateFormat: "dd MMM",
          intervalUnit: "day", // day, hour. Default: day
          tooltip: {
            enabled: true,
            format: "dd MMM yyyy",
          },
        },
        yAxis: {
          valueYField: "value",
        },
        onclick: () => {},
        // # additional for xCategoryType: radar # //
        labels: {
          textType: "adjusted",
          radius: 10,
          paddingTop: 0,
          paddingBottom: 0,
          fontSize: undefined,
        },
        categoryField: "category",
        valueField: "value",
        innerRadius: undefined,
        chartRadius: undefined,
      }
   * @object opts.merge<{WCObject}>
      {
        wordcloud: {
          categoryField: "category",
          valueField: "value",
          angles: [0,-90], // [0], [0,-90]. Default: [0,-90]
          labels: {
            paddingTop: 5,
            paddingBottom: 5,
            paddingLeft: 5,
            paddingRight: 5,
            fontFamily: "Times New Roman",
            _colors: {
              tone: "default", // default, mono, heat, custom.
              custom: [
                "#095256",
                "#087f8c",
                "#5aaa95",
                "#86a873",
                "#bb9f06",
              ],
              heat: {
                min: "#ffd4c2",
                max: "#ff621f",
              },
              ...(mergeWordcloudLabels._colors ?? {}),
            },
            _hoverEffect: {
              enabled: true,
              boxRounded: false,
              idleBoxColor: "#000000",
              hoverBoxColor: "#ff621f",
              hoverTextColor: "#ffffff",
            },
            _tooltip: {
              enabled: true,
              text: `"{category}": [bold]{value}[/]`,
            },
          },
        },
        onclick: () => {},
      }
   * @object opts.merge<{PieObject|XYObject}>.legend
      {
        enabled: true,
        separated: true,
        align: "left", // center, left
        markers: {
          size: 15,
        },
        labels: {
          fontSize: null,
        },
        labelValue: {
          visible: true,
          bold: true,
          fontSize: null,
        },
        layout: "grid", // grid,vertical,horizontal
        gridLayout: {
          maxColumns: null,
          fixedWidthGrid: 3,
        },
      }
   */
  static options(type, opts) {
    const types = ["xy", "pie", "radar", "wordcloud"];
    const xCategoryType = type === "xy"
      ? (opts.xCategoryType ?? "")
      : "";
    if (types.indexOf(type) === -1)
      console.warn(`Unrecognized type: ${type}`);
    type = types.indexOf(type) === -1 ? "xy" : type;
    const excludes = opts.excludes ?? [];
    const merge = opts.merge ?? {};
    const baseOpts = {
      labelFontSize: merge.labelFontSize ?? "13px",
      labelFontColor: merge.labelFontColor ?? undefined,
      paddingBottomCredit: merge.paddingBottomCredit ?? 15,
    };
    const legendOpts = {
      enabled: true,
      separated: false,
      align: "left", // center, left
      markers: {
        size: 15,
      },
      labels: {
        fontSize: null,
      },
      labelValue: {
        visible: true,
        bold: true,
        fontSize: null,
      },
      layout: "grid", // grid, vertical, horizontal. Default: grid
      gridLayout: {
        // maxColumns: 3,
        fixedWidthGrid: true,
      },
    };
    let options = { ...baseOpts };
    let typeOpts = {};

    // Fields of pie
    const pieLabelFields = ['category', 'percentage', 'value'];

    switch (type) {
      case "pie":
        const mLabels = merge.labels ?? {};
        typeOpts = {
          legend: { ...legendOpts },
          categoryField: "category",
          valueField: "value",
          radius: null,
          innerRadius: 30,
          labels: {
            aligned: mLabels.aligned ?? false,
            inlineLabelFields: ['percentage', 'category'],
            customText: mLabels.text ?? '',
            inlineText: mLabels.inlineText ?? true,
            textAlign: mLabels.textAlign ?? 'center',
            maxWidth: mLabels.maxWidth ?? null,
            oversizedBehavior: mLabels.oversizedBehavior ?? 'none', // none, truncate, wrap
            tooltipLabelFields: [...pieLabelFields],
          },
          // Set hoverScale to 1 to avoid slice to be scaled up on hover
          hoverScale: merge.hoverScale ?? null,
          // Set activeShiftRadius to 0 to avoid pull-out slice on click
          activeShiftRadius: merge.activeShiftRadius ?? null,
          // onclick: (e) => {
          //   const target = e.target;
          //   const dataItem = target ? target.dataItem : null;
          //   const context = dataItem ? dataItem.dataContext : null;
          // },
          // onready: (e) => {},
        };
        break;

      case "radar":
      case "xy":
        const xAxis = xCategoryType === "date"
          ? {
            xAxis: {
              categoryField: "date",
              inputDateFormat: "yyyy-MM-dd",
              categoryDateFormat: "dd MMM",
              intervalUnit: "day",
              tooltip: {
                enabled: true,
                format: "dd MMM yyyy",
              },
              showGrid: true,
            },
          }
          : {
            xAxis: {
              categoryField: "category",
              tooltip: { enabled: true },
              showGrid: true,
            },
          };
        const yAxis = {
          yAxis: {
            valueYField: "value",
            showGrid: true,
            showLabels: true,
          },
        };
        // @see https://www.amcharts.com/docs/v5/concepts/common-elements/tooltips/#Orientation
        // horizontal, vertical, down, up, left, right
        const cursorTooltip = {
          enabled: true,
          labelText: "{name}: [bold]{valueY}[/]",
          pointerOrientation: "horizontal",
        };
        typeOpts = {
          legend: { ...legendOpts },
          cursor: {
            enabled: true,
            behavior: null,
            visible: {
              lineX: true,
              lineY: false,
            },
            tooltip: {
              ...(merge.tooltip ?? cursorTooltip),
            },
          },
          bullets: {
            enabled: true, // Default: true
            shape: "circle", // circle,square. Default: square
            size: 8, // Default: 4
            hoverScale: 1.2, // {boolean|int>1}. Default: 3
          },
          series: {
            strokes: {
              strokeWidth: 2,
            },
            fills: {
              visible: false,
              fillOpacity: 0.1,
            },
            // ...(merge.series ?? {}),
          },
          valueLabels: {
            enabled: undefined, // Whether show value label
            outerFill: undefined, // Label fill color outside bar. Default: 0x333333
            innerFill: undefined, // Label fill color inside bar. Default: 0xffffff
          },
          ...xAxis,
          ...yAxis,
          // onclick: (e) => {
          //   const target = e.target ? e.target : null;
          //   const dataItem = target && target.dataItem
          //     ? target.dataItem
          //     : null;
          //   const context = dataItem && dataItem.dataContext
          //     ? dataItem.dataContext
          //     : null;
          // },
          // onready: (e) => {},
        };
        if (type === "radar") {
          const radarLabelsOpts = {
            // @see https://www.amcharts.com/docs/v5/charts/radar-chart/radar-axes/#Label_type
            // circular (default), radial, adjusted
            textType: "adjusted",
            radius: 10,
            paddingTop: 0,
            paddingBottom: 0,
            fontSize: undefined,
          };
          const radarOpts = AMC.deepMerge({
            categoryField: 'category',
            valueField: 'value',
            innerRadius: undefined,
            chartRadius: undefined,
            labels: { ...radarLabelsOpts },
          }, merge);
          typeOpts = AMC.deepMerge(typeOpts, radarOpts);
          ['xAxis', 'yAxis'].forEach((f) => delete typeOpts[f]);
        }
        break;

      case "wordcloud":
        let labelOpts = {
          paddingTop: 5,
          paddingBottom: 5,
          paddingLeft: 5,
          paddingRight: 5,
          fontFamily: "Times New Roman",
          _colors: {
            tone: "default", // default, mono, heat, custom.
            custom: [
              "#095256",
              "#087f8c",
              "#5aaa95",
              "#86a873",
              "#bb9f06",
            ],
            heat: {
              min: "#ffd4c2",
              max: "#ff621f",
            },
          },
          _hoverEffect: {
            enabled: true,
            boxRounded: false,
            idleBoxColor: "#000000",
            hoverBoxColor: "#ff621f",
            hoverTextColor: "#ffffff",
          },
          _tooltip: {
            enabled: true,
            text: `"{category}": [bold]{value}[/]`,
          },
        };
        typeOpts = {
          wordcloud: {
            categoryField: "category",
            valueField: "value",
            angles: [0, -90], // [0], [0,-90]. Default: [0,-90]
            background: undefined, // #hex
            backgroundOpacity: 1,
            maxCount: undefined, // Number
            minWordLength: undefined, // Number
            excludeWords: undefined, // Array<string>
            minFontSize: undefined, // (range: 1-100)
            maxFontSize: undefined, // (range: 1-100)
            labels: { ...labelOpts },
            // onclick: (e) => {
            //   const category = e.target.dataItem.get("category");
            //   alert(category);
            // },
          },
        };
        typeOpts.wordcloud = AMC.deepMerge(
          typeOpts.wordcloud, merge.wordcloud ?? {});
        break;
    };

    options = AMC.deepMerge(options, typeOpts);
    if (excludes.length) {
      excludes.forEach((field) => delete options[field]);
    }

    options = AMC.deepMerge(options, merge);

    return options;
  }

  /**
   * Transform given data for series of Incremental growth
   * @param {array} rawData of:
   * [
   *   {
   *     ch_key: {string},
   *     label: {string},
   *     value: {object} of {x: {string}, item1: {int}},
   *   },
   * ]
   * @return {array} of:
   * [
   *   {
   *     date: {string},
   *     {item_key}: {int},
   *   },
   * ]
   */
  seriesDataIncGrowth(rawData) {
    const firstResult = rawData
      .find((item) => item.dataresult && item.dataresult.length);
    const firstValue = firstResult ? firstResult.dataresult : [];
    if (!firstValue.length) return [];

    // Item data keyBy date
    const dataKeyed = {};
    const keys = rawData.map(item => item.ch_key);
    firstValue.forEach(item => dataKeyed[item.x] = {});

    /**
     * Find item in value of given key and date
     * @param {string} key
     * @param {string} date
     * @return {object}
     */
    const findItemByDate = (key, date) => {
      const item = rawData.find(it => it.ch_key === key);
      if (!item) return {};

      const found = (item.value ?? item.dataresult ?? [])
        .find(it => it.x === date);

      return found || {};
    };
    const dates = Object.keys(dataKeyed);
    dates.forEach(date => {
      const mapData = { date };
      keys.forEach(key => mapData[key] = findItemByDate(key, date).item1 ?? 0);
      dataKeyed[date] = mapData;
    });

    return dates.map(key => dataKeyed[key]);
  }

  /**
   * Get items data of given rawdata
   * @param {array} rawData @see seriesDataIncGrowth
   * @return {array} of:
   * [
   *   {
   *     ch_key: {string},
   *     label: {string}},
   *     settings: {object}, of {stroke: {am5.Color}, fill: {am5.Color}}
   *   },
   * ]
   */
  itemsDataIncGrowth(rawData) {
    const colors = AMC.getAppColors();
    return rawData.map((item, index) => {
      const newItem = AMCData.buildItemData(item, index, colors);
      ['value', 'dataresult'].forEach(it => delete newItem[it]);
      return newItem;
    });
  }

  /**
   * Transform given data for series of growth (inc & diff)
   * @param {array} rawData of:
   * [
   *   {
   *     ch_key: {string},
   *     label: {string},
   *     value: {object} of {x: {string}, item1: {int}},
   *   },
   * ]
   * @return {array} of:
   * [
   *   {
   *     date: {string},
   *     diff_0: {int}, // diff coun between this date and previous
   *     diff_1: {int},
   *     total_0: {int},
   *     total_1: {int},
   *     ...
   *   },
   * ]
   */
  seriesDataCombinedGrowth(rawData) {
    // Item data keyBy date
    const dataKeyed = {};
    const item_keys = rawData.map((it) => it.ch_key);
    const sample = rawData.find((it) => it.value && it.value.length);
    (sample && sample.value ? sample.value : [])
      .forEach((it) => dataKeyed[it.x] = {});
    const dates = Object.keys(dataKeyed);
    const isSingleDate = dates.length === 1;

    /**
     * Find item in value of given key and date
     * @param {string} key
     * @param {string} date
     * @return {object}
     */
    const findByDate = (key, date) => {
      const item = rawData.find((it) => it.ch_key === key);
      if (!item) return {};
      const found = (item.value ?? []).find((it) => it.x === date);
      return found ? found : {};
    };

    /**
     * Count diff item of given key & date with its previous date
     * @param {string} key
     * @param {string} date
     * @return {int}
     */
    const diffByDate = (key, date) => {
      const currentItem = findByDate(key, date);
      const currentIndex = dates.indexOf(date);
      if (currentIndex <= 0) return 0;
      const prevItem = findByDate(key, dates[currentIndex - 1]);
      return (currentItem.item1 ?? 0) - (prevItem.item1 ?? 0);
    };

    dates.forEach((date) => {
      let mapdata = { date };
      item_keys.forEach((key, index) => {
        let field = `total_${index}`;
        mapdata = {
          ...mapdata,
          [field]: findByDate(key, date).item1,
        };
        if (!isSingleDate) {
          field = `diff_${index}`;
          mapdata[field] = diffByDate(key, date);
        }
      });
      dataKeyed[date] = mapdata;
    });
    return dates.map((key) => dataKeyed[key]);
  }

  /**
   * Get items data of given rawdata
   * @param {array} rawData @see seriesDataCombinedGrowth
   * @return {array} of:
   * [
   *   {
   *     ch_key: {string},
   *     label: {string}},
   *     settings: {object}, of {stroke: {am5.Color}, fill: {am5.Color}}
   *   },
   * ]
   */
  itemsDataCombinedGrowth(rawData) {
    const colors = AMC.getAppColors();
    return rawData.map((item, index) => {
      const newItem = AMCData.buildItemData(item, index, colors);
      ['value', 'ch_key'].forEach((field) => delete newItem[field]);
      return newItem;
    });
  }

  /**
   * Get items data of given itemsData
   * @param {array} itemsData of:
   * [
   *   [
   *     key: {string},
   *     label: {string},
   *   ]
   * ]
   * @return {array} of:
   * [
   *   {
   *     key: {string},
   *     label: {string}},
   *     settings: {object}, of {stroke: {am5.Color}, fill: {am5.Color}}
   *   },
   * ]
   */
  itemsDataTopDailyStackedColumn(itemsData) {
    const colors = AMC.getAppColors();
    return itemsData.map((item, index) => {
      return AMCData.buildItemData(item, index, colors);
    });
  }

  /**
   * Transform given data for series of Top Tracker
   * @param {object} rawData of:
   * {
   *   [item_key]: {object} of:
   *   {
   *     key: {int},
   *     value: {array} of [{x: {string}, item1: {int}}],
   *   },
   * }
   * @return {array} of:
   * [
   *   {
   *     date: {string},
   *     {item_key}: {int},
   *   },
   * ]
   */
  seriesDataTopTracker(rawData) {
    // Item data keyBy date
    const dataKeyed = {};

    const keys = Object.keys(rawData);
    const values = rawData[keys[0]].value;
    values.forEach((item) => dataKeyed[item.x] = {});

    /**
     * Find item in value of given key and date
     * @param {string} key
     * @param {string} date
     * @return {object}
     */
    const findItemByDate = (key, date) => {
      const values = rawData[key].value ?? null;
      if (!(values && values.length)) return {};
      return values.find((item) => item.x === date);
    };

    const dates = Object.keys(dataKeyed);
    dates.forEach((date) => {
      const mapdata = { date };
      keys.forEach((key) => mapdata[key] = findItemByDate(key, date).item1);
      dataKeyed[date] = mapdata;
    });

    return dates.map((key) => dataKeyed[key]);
  }

  /**
   * Get items data of given rawdata
   * @param {array} itemsData of:
   * [
   *   {
   *     id: {int},
   *     label: {string},
   *     ch_key: {string},
   *     color: {string},
   *   },
   * ]
   * @return {array} of:
   * [
   *   {
   *     ...,
   *     settings: {object}, of {stroke: {am5.Color}, fill: {am5.Color}}
   *   },
   * ]
   */
  itemsDataTopTracker(itemsData) {
    const colors = AMC.getAppColors();
    return itemsData.map((item, index) => {
      return AMCData.buildItemData(item, index, colors);
    });
  }

  /**
   * Transform given data for series of Issues
   * @param {array} itemsData of:
   * [
   *   {
   *     id: {int},
   *     _: {int},
   *     ch_key: {int},
   *     dataresult: {array} of [{x: {string}, item1: {int}}],
   *     label: {string},
   *   },
   * ]
   * @return {array} ~ of:
   * [
   *   {
   *     date: {string},
   *     {item_key}: {int},
   *   },
   * ]
   */
  seriesDataIssues(itemsData) {
    const firstResult = itemsData
      .find((item) => item.dataresult && item.dataresult.length);
    const firstValue = firstResult ? firstResult.dataresult : [];
    if (!firstValue.length) return [];

    // Item data keyBy date
    const dataKeyed = {};
    const keys = itemsData.map(item => item.ch_key);
    firstValue.forEach(item => dataKeyed[item.x] = {});

    /**
     * Find item in value of given key and date
     * @param {string} key
     * @param {string} date
     * @return {object}
     */
    const findItemByDate = (key, date) => {
      const item = itemsData.find(item => item.ch_key === key);
      const values = item && item.dataresult ? item.dataresult : null;
      if (!(values && values.length)) return {};
      return values.find(item => item.x === date);
    };

    const dates = Object.keys(dataKeyed);
    dates.forEach(date => {
      const mapdata = { date };
      keys.forEach(key => mapdata[key] = findItemByDate(key, date).item1 ?? 0);
      dataKeyed[date] = mapdata;
    });

    return dates.map(key => dataKeyed[key]);
  }

  /**
   * Get items data of given rawdata for Issues
   * @param {array} itemsData @see seriesDataIssues
   * @return {array} of:
   * [
   *   {
   *     ...,
   *     settings: {object}, of {stroke: {am5.Color}, fill: {am5.Color}}
   *   },
   * ]
   */
  itemsDataIssues(itemsData) {
    const colors = AMC.getAppColors();
    return itemsData.map((item, index) => {
      const newItem = AMCData.buildItemData(item, index, colors);
      delete newItem.dataresult;
      return newItem;
    });
  }

  /**
   * Transform given data for series of Clustered Column
   * @param {array} rawData of:
   * [
   *   {
   *     items: {array} of:
   *     [
   *       {
   *         name: {string},
   *         value: {int|string},
   *       },
   *     ],
   *   },
   * ]
   * @return {array} of:
   * [
   *   {
   *     {name_key}: {int|string},
   *   },
   * ]
   */
  seriesDataClusteredColumn(rawData) {
    return rawData.map(it => {
      const obj = {};
      (it.items ?? []).forEach(_it => {
        const name = _it.name ?? undefined;
        if (!name) return true;

        /** @type {number|string} */
        const value = "undefined" !== typeof _it.value
          ? Number(_it.value)
          : (_it.label ?? 'Untitled');

        obj[name] = value;
      });
      return obj;
    });
  }

  /**
   * Transform given data for items of Clustered Column
   * @param {array} rawData of:
   * [
   *   {
   *     items: {array} of:
   *     [
   *       {
   *         name: {string},
   *         label: {string},
   *         value: {int|string},
   *       },
   *     ],
   *   },
   * ]
   * @return {array} of:
   * [
   *   {
   *     ch_key: {string},
   *     label: {string},
   *   },
   * ]
   */
  itemsDataClusteredColumn(rawData) {
    const keyedData = {};
    rawData.forEach(it => {
      (it.items ?? []).forEach(_it => {
        const hasValue = "undefined" !== typeof _it.value;
        const label = _it.label ?? undefined;
        const name = _it.name ?? undefined;
        const isKeyed = name && "undefined" !== typeof keyedData[name];
        if (!hasValue || !label || !name || isKeyed) return true;
        keyedData[name] = label;
      });
    });

    return Object.keys(keyedData).map((ch_key) => ({
      ch_key,
      label: keyedData[ch_key]
    }));
  }

  /**
   * Transform given data for series of Clustered Column
   * @param {array} rawData of:
   * [
   *   {
   *     [category|date]: {string|int},
   *     series: {array} of:
   *     [
   *       {
   *         key: {string},
   *         label: {string},
   *         doc_count: {int},
   *       },
   *     ],
   *   },
   * ]
   * @return {array} of:
   * [
   *   {
   *     [category|date]: {int|string},
   *     [name_key]: {int|string},
   *   },
   * ]
   */
  seriesDataVerticalClusteredColumn(rawData) {
    return rawData.map(item => {
      const clonedItem = {...item};
      const keyedSeries = {};
      [...(clonedItem.series ?? [])].forEach(it => {
        /** @type {string|null} */
        const key = (() => {
          /** @type {string|undefined} */
          const keyField = ['key', 'name', 'slug', 'label']
            .find(k => it[k]
              ? `${it[k].trim().replace(/\W/g, '').toLowerCase()}`
              : null);
          return keyField ? it[keyField] : null;
        })();
        if (!key) return !0;
        /** @type {number} */
        const value = Number(it.doc_count || it.value || 0);
        keyedSeries[key] = !isNaN(value) ? value : 0;
      });
      delete clonedItem.series;
      return {...clonedItem, ...keyedSeries};
    });
  }

  /**
   * Transform given data for items of Clustered Column
   * @param {array} rawData of:
   * [
   *   {
   *     [category|date]: {string|int},
   *     series: {array} of:
   *     [
   *       {
   *         key: {string},
   *         label: {string},
   *         doc_count: {int},
   *       },
   *     ],
   *   },
   * ]
   * @return {array} of:
   * [
   *   {
   *     [ch_key]: {string},
   *     label: {string},
   *   },
   * ]
   */
  itemsDataVerticalClusteredColumn(rawData) {
    const keyedData = {};
    rawData.forEach(item => {
      item.series?.forEach(it => {
        const key = (() => {
          /** @type {string|undefined} */
          const itemField = ['key', 'slug', 'name', 'label']
            .find(k => it[k]
              ? `${it[k].trim().replace(/\W/g, '').toLowerCase()}`
              : null);
          return itemField ? it[itemField] : null;
        })();
        if (!key) return !0;

        const isKeyed = key && "undefined" !== typeof keyedData[key];
        if (isKeyed) return !0;
        const label = (() => {
          /** @type {string|undefined} */
          const itemField = ['label', 'name', 'slug', 'key']
            .find(k => it[k] ? `${it[k].trim()}` : null);
          return itemField ? it[itemField] : key;
        })();
        keyedData[key] = label;
      });
    });
    
    return Object.keys(keyedData).map(ch_key => ({
      ch_key,
      label: keyedData[ch_key]
    }));
  }

  /**
   * Transform given data for series of Top Growth Account
   * @param {array} rawData of:
   * [
   *   {
   *     date: {string},
   *     timestamp: {int},
   *     [item_key]: {int},
   *   },
   * ]
   * @return {array} of:
   * [
   *   {
   *     date: {string},
   *     [item_key]: {int},
   *   },
   * ]
   */
  seriesDataTopAccount(rawData) {
    const data = [];
    const excludes = ['timestamp'];
    rawData.forEach((item) => {
      const newItem = { ...item };
      excludes.forEach((field) => delete newItem[field]);
      data.push(newItem);
    });
    return data;
  }

  /**
   * Get items data of given rawdata for Top Account
   * @param {array} itemsData of:
   * [
   *   {
   *     username: {string},
   *     label: {string},
   *     total: {int},
   *     color: {string},
   *   },
   * ]
   * @return {array} of:
   * [
   *   {
   *     ...,
   *     settings: {object}, of {stroke: {am5.Color}, fill: {am5.Color}}
   *   },
   * ]
   */
  itemsDataTopAccount(itemsData) {
    const colors = AMC.getAppColors();
    return itemsData.map((item, index) => {
      const newItem = AMCData.buildItemData(item, index, colors);
      newItem.ch_key = newItem.ch_key ?? newItem.username ?? "";
      return newItem;
    });
  }

  /**
   * Transform given data for series of Daily Dist Sentiment
   * @param {object} rawData of:
   * {
   *   [item_key]: {object} of: [{x: {string}, item1: {int}}],
   * }
   * @return {array} of:
   * [
   *   {
   *     date: {string},
   *     [item_key]: {int},
   *   },
   * ]
   */
  seriesDataDailyDistSentiment(rawData) {
    // Item data keyBy date
    const dataKeyed = {};
    const keys = Object.keys(rawData);
    const nonEmptyKey = keys.find((field) => {
      const val = rawData[field];
      return val && val.length > 0;
    });
    const values = nonEmptyKey ? rawData[nonEmptyKey] : [];
    values.forEach((item) => dataKeyed[item.x] = {});

    // Find item in value of given key and date
    const findItemByDate = (key, date) => {
      const values = rawData[key] ?? null;
      if (!(values && values.length)) return {};
      return values.find((item) => item.x === date);
    };

    const dates = Object.keys(dataKeyed);
    dates.forEach((date) => {
      const mapdata = { date };
      keys.forEach((key) => {
        mapdata[key] = findItemByDate(key, date).item1
      });
      dataKeyed[date] = mapdata;
    });
    return dates.map((key) => dataKeyed[key]);
  }

  /**
   * Get items data of given rawdata for Daily Dist Sentiment
   * @param {object} rawData @see seriesDataDailyDistSentiment
   * @param {object|string|null} dataType Eg. sentimen, bot, platform. Default: sentimen
   * @return {array} of:
   * [
   *   {
   *     ...,
   *     settings: {object}, of {stroke: {am5.Color}, fill: {am5.Color}}
   *   },
   * ]
   */
  itemsDataDailyDistSentiment(rawData, dataType=null) {
    const mapLabel = dataType && typeof dataType === 'object'
      ? dataType
      : AMC.getMapLabel(dataType ?? 'sentimen');

    return Object.keys(rawData).map((key) => {
      /** @var {object|null} item */
      const item = mapLabel[key] ? mapLabel[key] : null;

      const label = item && item.label
        ? item.label
        : AMC.ucfirst(key).replace(/_/g, ' ');
      const data = { ch_key: key, label };
      if (item) {
        /** @var {string|null} */
        const color = item.color ?? null;

        /** @var {float|null} */
        const opacity = color && /^rgba\b/.test(color)
          ? (parseFloat(color.split(',')[3]) || 1)
          : null;

        data.settings = {
          stroke: color ? am5.color(color) : null,
          fill: color ? am5.color(color) : null,
          opacity,
        };
      }
      return data;
    });
  }

  /**
   * Transform given data for series of Hourly Dist Sentiment
   * An alias for seriesDataDailyDistSentiment
   * @param {object} rawData @see seriesDataDailyDistSentiment
   * @return {array} of:
   * [
   *   {
   *     date: {string},
   *     [item_key]: {int},
   *   },
   * ]
   */
  seriesDataHourlyDistSentiment(rawData) {
    return this.seriesDataDailyDistSentiment(rawData);
  }

  /**
   * Get items data of given rawdata for Hourly Dist Sentiment
   * An alias for itemsDataDailyDistSentiment
   * @param {array} rawData @see seriesDataHourlyDistSentiment
   * @param {object|string|null} dataType
   * @return {array} of:
   * [
   *   {
   *     ...,
   *     settings: {object}, of {stroke: {am5.Color}, fill: {am5.Color}}
   *   },
   * ]
   */
  itemsDataHourlyDistSentiment(rawData, dataType=null) {
    return this.itemsDataDailyDistSentiment(rawData, dataType);
  }

  /**
   * @deprecated @see seriesDataPieChart()
   * Transform given data for series of Popular Sentiment
   * @param {array} rawData of:
   * [
   *  {
   *    category: {string},
   *    value: {int},
   *    meta_field: {string},
   *    key: {string},
   *    settings: {object} of: { fill: {object}, stroke: {object} },
   *  },
   * ]
   * @param {string} metafield
   * @return {array} of:
   * [
   *   {
   *     category: {string},
   *     value: {int},
   *     key: {string},
   *     settings: {object},
   *     meta_field: {string},
   *   },
   * ]
   */
  seriesDataPopular(rawData, metafield) {
    let data_type = ''; // bot, sentimen

    // auto suggest meta field based on label
    let _meta_field = metafield
      ? metafield
      : ((data) => {
        let result = '';
        const patterns = {
          bot: {
            labels: [/\bbot\b/, /\bhuman\b/],
          },
          sentimen: {
            labels: [/\bpos/, /\bneg/],
          },
        };

        for (const ptype in patterns) {
          const matchTests = [];
          data.forEach((item) => {
            const hasDto = "object" === typeof item.dto
              ? item.dto
              : false;
            const label0 = (hasDto
              ? (hasDto.label ?? hasDto.slug ?? "")
              : (item.label ?? item.key ?? "")).toLowerCase();
            patterns[ptype].labels.forEach((rgx) => {
              if (rgx.test(label0)) matchTests.push(rgx);
            });
          });
          if (matchTests.length === patterns[ptype].labels.length) {
            data_type = `${ptype}`;
            result = `metadata.classifiers.${ptype}.label`;
            break;
          }
        }

        return result;
      })(rawData);
    if (!data_type && _meta_field) {
      data_type = /\.bot\./.test(_meta_field)
        ? "bot"
        : (/sentiment?/.test(_meta_field) ? "sentimen" : "");
    }
    const mapLabel = AMC.getMapLabel(data_type);
    const whitelistFields = [
      'category', 'value', 'key', 'settings', 'meta_field',
    ];

    return rawData.map((item) => {
      const hasDto = "object" === typeof item.dto
        ? item.dto
        : false;
      const label0 = (hasDto
        ? (hasDto.label ?? hasDto.slug ?? item.label ?? item.key)
        : (item.label ?? item.key)
      ).toLowerCase();
      const revLabel = {
        positive: "positif",
        negative: "negatif",
        neutral: "netral",
      };
      item.key = hasDto
        ? (hasDto.slug ?? item.key)
        : (item.ch_key ?? item.key ?? revLabel[label0] ?? label0);
      const mapItem = mapLabel[label0] ?? mapLabel[item.key] ?? null;
      item.category = AMC.ucfirst(mapItem
        ? `${mapItem.label}`.toLowerCase()
        : label0);
      // console.warn('data_type', data_type, 'mapLabel', mapLabel, 'mapItem', mapItem);
      if (mapItem) {
        item.settings = {
          stroke: mapItem.color,
          fill: mapItem.color,
        };
      }

      item.value = hasDto
        ? (hasDto.total ?? item.doc_count)
        : item.value;
      // item.meta_field = 'metadata.classifiers.sentimen.label';
      // [!] this should be retrieved from dto
      item.meta_field = hasDto && hasDto.metafield
        ? hasDto.metafield
        : _meta_field;

      Object.keys(item).forEach((field) => {
        if (whitelistFields.indexOf(field) === -1)
          delete item[field];
      });
      return item;
    });
  }

  /**
   * Transform given data for series of pie chart
   * @param {array} rawData
   * @param {string} metaField
   * @return {array} of:
   * [
   *   {
   *     category: {string},
   *     value: {int},
   *     key: {string},
   *     settings: {object},
   *     meta_field: {string},
   *   },
   * ]
   */
  seriesDataPieChart(rawData, metaField) {
    /** @var {'bot'|'sentimen'|''}*/
    let dataType = '';

    const dataTypePatterns = {
      bot: {
        labels: [/\bbot\b/, /\bhuman\b/],
      },
      sentimen: {
        labels: [/\bpos/, /\bneg/],
      },
    };

    // Guess metaField based on rawData item label
    metaField = (it => {
      if (it) return it;

      let guessedMetaField = '';

      Object.keys(dataTypePatterns).forEach(ptype => {
        const matchTests = [];
        rawData.forEach(item => {
          /** @type {object} */
          const dto = item.dto ?? item;
          const label = (dto.label ?? dto.slug ?? dto.key ?? '').toLowerCase();
          dataTypePatterns[ptype].labels.forEach(pattern => {
            if (pattern.test(label)) matchTests.push(pattern);
          });
        });
        if (matchTests.length === dataTypePatterns[ptype].labels.length) {
          dataType = `${ptype}`;
          guessedMetaField = `metadata.classifiers.${ptype}.label`;
          return false;
        }
      });

      return guessedMetaField;
    })(metaField);

    // Failover: set empty dataType value if metaField is not empty
    dataType = !dataType && metaField
      ? (/\.bot\./.test(metaField)
        ? "bot"
        : (/sentiment?/.test(metaField) ? "sentimen" : ""))
      : dataType;

    const mapLabel = AMC.getMapLabel(dataType);
    const whitelistFields = [
      'category', 'value', 'key', 'settings', 'meta_field',
    ];

    return rawData.map(item => {
      /** @type {boolean} */
      const hasDto = "object" === typeof item.dto;

      /** @type {object} */
      const dto = item.dto ?? item;

      const label = (dto.label ?? dto.slug ?? item.key ?? '').toLowerCase();

      const revLabel = {
        positive: "positif",
        negative: "negatif",
        neutral: "netral",
      };
      item.key = hasDto
        ? (dto.slug ?? item.key)
        : (item.ch_key ?? item.key ?? revLabel[label] ?? label);

      /** @type {object|null} */
      const mapItem = mapLabel[label] ?? mapLabel[item.key] ?? null;
      item.category = AMC.ucfirst((mapItem?.label ?? label).toLowerCase());

      // console.warn('data_type', data_type, 'mapLabel', mapLabel, 'mapItem', mapItem);
      if (mapItem && mapItem.color) {
        item.settings = {
          stroke: mapItem.color,
          fill: mapItem.color,
        };
      }

      item.value = dto.total ?? item.doc_count ?? item.value ?? 0;
      item.meta_field = hasDto && dto.metafield ? dto.metafield : metaField;

      Object.keys(item).forEach(itemField => {
        if (!whitelistFields.includes(itemField))
          delete item[itemField];
      });
      return item;
    });
  }

  /**
   * Transform given data for series of Popular Emotion
   * @param {array} rawData of:
   * [
   *  {
   *    key: {string},
   *    doc_count: {int},
   *    extra: {object},
   *    dto: {object} of {slug: {string}, total: {int}},
   *  },
   * ]
   * @param {string} metafield
   * @return {array} of:
   * [
   *   {
   *     category: {string},
   *     value: {int},
   *     key: {string},
   *     settings: {object},
   *     meta_field: {string},
   *   },
   * ]
   */
  seriesDataPopularEmotion(rawData, metafield) {
    return rawData.map((item) => {
      const hasDto = "undefined" !== typeof item['dto'];
      const extra_field = "avg_metadata.classifiers.emosi.anger";
      const key = hasDto ? item.dto.slug : item.key;
      const newItem = {
        category: AMC.ucfirst(key),
        value: hasDto
          ? item.dto.total
          : (item.extra[extra_field] ?? item.doc_count ?? 0),
        key,
        meta_field: metafield,
      };
      return newItem;
    });
  }

  /**
   * Transform given data for series of WordCloud
   * @param {array} rawData of:
   * [
   *   [
   *     {string}, // keyword
   *     {int}, // value
   *   ],
   * ]
   * @param {object} wordcloudOpts of:
   * {
   *   maxCount: {int}, // optional
   *   minWordLength: {int}, // optional
   *   excludeWords: {array}, // optional
   * },
   * @return {Array<{category: string, value: number}>}
   */
  seriesDataWordcloud(rawData, wordcloudOpts) {
    /** @type {number|undefined} */
    const maxCount = (() => {
      /** @type {number|typeof NaN} */
      const numVal = Math.round(wordcloudOpts.maxCount);
      return isNaN(numVal) || numVal <= 0 ? undefined : numVal;
    })();

    /** @type {number|undefined} */
    const minWordLength = (() => {
      /** @type {number|typeof NaN} */
      const numVal = Math.round(wordcloudOpts.minWordLength);
      return isNaN(numVal) || numVal <= 0 ? undefined : numVal;
    })();

    /** @type {Set<string>} */
    const excludeWords = (() => {
      const excludeWords = Array.isArray(wordcloudOpts.excludeWords)
        ? wordcloudOpts.excludeWords
        : [];
      return new Set(excludeWords.map(word => String(word ?? '').trim().toLowerCase()));
    })();

    /** @type {Array<{category: string, value: number}>} */
    let seriesData = rawData.map(([category, value]) => ({
      category: String(category ?? '').trim(),
      value: Number(value ?? 0),
    }));

    // Filter: by minWordLength or excludeWords
    if (minWordLength || excludeWords.size) {
      seriesData = seriesData
        .filter(it => {
          if (minWordLength && it.category.length < minWordLength) return false;
          if (excludeWords.has(it.category)) return false;
          return true;
        });
    }

    seriesData = seriesData.sort((a, b) => b.value - a.value);

    // Limit by maxCount
    if (maxCount) seriesData = seriesData.slice(0, maxCount);

    const labelOpts = wordcloudOpts.labels ?? {};

    if (labelOpts._colors?.tone === 'highlight') {
      const highlightOpts = labelOpts._colors.highlight ?? {};

      /** @type {number} */
      const limitTopCount = (() => {
        let val = parseInt(highlightOpts.topCount ?? 0);
        return val > 0 ? val : 0;
      })();

      /** @type {am5.Color} */
      const topColor = (() => {
        let colorVal = highlightOpts.topColor || '#1e26ff'
        return AMC.parseColorAndOpacity(colorVal).color;
      })();

      /** @type {am5.Color} */
      const baseColor = (() => {
        let colorVal = highlightOpts.baseColor || '#cccccc'
        return AMC.parseColorAndOpacity(colorVal).color;
      })();

      seriesData = seriesData.map((item, index) => {
        return {
          ...item,
          labelSettings: {
            fill: index < limitTopCount ? topColor : baseColor,
          }
        };
      });
    }

    return seriesData;
  }

  /**
   * Transform given data for series of Daily Dist Buzz of News
   * @param {object} rawData of:
   * [
   *   {
   *     x: {string},
   *     item1: {int},
   *   },
   * ]
   * @return {array} of:
   * [
   *   {
   *     date: {string},
   *     value: {int},
   *   },
   * ]
   */
  seriesDataDailyDist(rawData) {
    return rawData.map(item => {
      return AMCData.parseItemDataSettings({
        date: `${item.x}`,
        value: (item.item1 ?? 0) + 0,
        color: item.color || "",
        data_settings: item.data_settings || undefined,
      });
    });
  }

  /**
   * Transform given data for series of Popular Hours (News)
   * @param {object} rawData of:
   * [
   *   {
   *     key: {string},
   *     freq: {int},
   *   },
   * ]
   * @return {array} of:
   * [
   *   {
   *     category: {string},
   *     value: {int},
   *   },
   * ]
   */
  seriesDataPopularHour(rawData) {
    return rawData.map((item) => {
      return {
        category: `${item.key ?? ""}`,
        value: (item.freq ?? 0) + 0,
      };
    });
  }

  /**
   * Transform given data for series of Daily Dist Popular Media (News)
   * @param {object} rawData of:
   * [
   *   {
   *     media: {string},
   *     data: {array}, of [{x: {string}, item1: {int}}, ..]
   *   },
   * ]
   *
   * @return {array} ~ of:
   * [
   *   {
   *     date: {string},
   *     [item_key]: {int},
   *   },
   * ]
   */
  seriesDataDailyDistPopularMedia(rawData) {
    const keyedByDate = {};
    const first = rawData[0].data ?? [];
    first.forEach((item) => keyedByDate[item.x] = {});

    /**
     * Find item in value of given key and date
     * @param {string} key
     * @param {string} date
     * @return {object}
     */
    const findItemByDate = (key, date) => {
      const dataByKey = rawData.find((item) => item.media === key);
      const found = dataByKey
        ? dataByKey.data.find((dataItem) => dataItem.x === date)
        : {};
      return found;
    };

    const dates = Object.keys(keyedByDate);
    dates.forEach((date) => {
      const mapdata = { date };
      rawData.forEach((item) => {
        const media = item.media;
        mapdata[media] = findItemByDate(media, date).item1
      });
      keyedByDate[date] = mapdata;
    });
    return dates.map((date) => keyedByDate[date]);
  }

  /**
   * Transform given data for horizontal column of specfied metric field
   * Eg. likes_count
   * @param {object} rawData of:
   * [
   *   {
   *     ?dto: {object},
   *     metadata: {object},
   *   },
   * ]
   * @param {string} metricField Metric fields of: [likes_count, engage_score, etc].
   * Default: likes_count.
   *
   * @return {array} of:
   * [
   *   {
   *     category: {string},
   *     value: {string},
   *     avatar: {string},
   *     color: {string},
   *   },
   * ]
   */
  seriesDataHorizontalColumnTopMetric(rawData, metricField) {
    metricField = metricField ?? 'likes_count';

    /** @type {string[]} */
    const cachedCategories = [];

    return rawData.map(it => {
      let item = {};
      const meta = it.metadata ?? it;
      const dto = "object" === typeof it.dto ? it.dto : undefined;
      if (dto) {
        const user = dto.user ?? {};
        item = {
          ...item,
          category: dto.text ?? dto.key ?? "",
          value: (dto.metric ?? {})[metricField] ?? meta[metricField] ?? 0,
          avatar: user.avatar_cache ?? user.avatar ?? meta.from_avatar ?? "",
        };
      }
      else {
        item = {
          ...item,
          category: meta.message ?? meta.key ?? "",
          value: meta[metricField] ?? 0,
          avatar: meta.from_avatar ?? "",
        };
      }

      item = {
        ...item,
        color: dto?.color ?? meta?.color ?? "",
        data_settings: dto?.data_settings ?? meta?.data_settings ?? undefined,
      };
      item = AMCData.parseItemDataSettings(item);

      const maxLen = 100;
      const catLen = `${item.category}`.length;
      item.category = ((text) => {
        text = text.trim()
          .replace(/[\r\n\t]+/g, ' ')
          .replace(/\s{2,}/g, ' ');
        const parts = `${text}`.split(' ');
        const rebuild = [];
        let buildLen = 0;
        parts.forEach((word) => {
          if (buildLen >= maxLen) return !1;
          rebuild.push(word);
          buildLen += `${word}`.length;
        });
        let category = rebuild.join(' ') + (catLen > maxLen ? '...' : '');
        return AMC.rebuildSuffixedCategory(
          category, cachedCategories, rawData.length);
      })(item.category);
      cachedCategories.push(item.category);

      return item;
    });
  }

  /**
   * Transform given data for horizontal column (reviews)
   * List will be sorted by its review_count
   * @param {object} rawData of:
   * [
   *   {
   *     id: string,
   *     label: string,
   *     slug: string,
   *     url: string,
   *     review_count: int,
   *   }
   * ]
   *
   * @return {array} of:
   * [
   *   {
   *     category: {string},
   *     value: {string},
   *     avatar: {string},
   *   },
   * ]
   */
  seriesDataHorizontalColumnTopReviews(rawData) {
    const data = rawData.map(it => {
      const item = {
        category: it.label,
        value: it.review_count ?? 0,
        avatar: it.avatar ?? '',
        color: it.color ?? '',
        data_settings: it.data_settings ?? undefined,
      };
      return AMCData.parseItemDataSettings(item);
    });
    data.sort((a, b) => b.value - a.value);

    /** @type {string[]} */
    const cachedCategories = [];

    return data.map(it => {
      const category = it.category;
      const mapData = {
        ...it,
        category: AMC.rebuildSuffixedCategory(
          category, cachedCategories, data.length
        ),
      };
      cachedCategories.push(mapData.category);
      return mapData;
    });
  }

  /**
   * Transform given data for vertical column (reviews)
   * @param {array} rawData
   * @return {array}
   */
  seriesDataVerticalColumnCategory(rawData) {
    const data = rawData.map(it => {
      const dto = it.dto ?? it;
      const item = {
        category: dto.slug ?? it.label ?? it.name ?? it.key ?? 'n/a',
        value: dto.total ?? it.value ?? it.doc_count ?? 0,
        avatar: it.avatar ?? '',
        color: dto.color ?? it.color ?? '',
        data_settings: dto.data_settings ?? it.data_settings ?? undefined,
      };

      return AMCData.parseItemDataSettings(item);
    });

    /** @type {string[]} */
    const cachedCategories = [];

    return data.map(it => {
      const category = it.category;
      const mapData = {
        ...it,
        category: AMC.rebuildSuffixedCategory(
          category, cachedCategories, data.length
        ),
      };
      cachedCategories.push(mapData.category);
      return mapData;
    });
  }
};
// end: AMCData

/**
 * AmChart Helper
 */
class AMC {
  /** @var {string} */
  chartId;

  /** @var {am5.Root} */
  #root;

  /** @var {am5.Chart} */
  #chart;

  /** @var {object} */
  chartOpts;

  /** @var {object} params from constructor */
  #params;

  /** @var {boolean} ~ Whether to dispose logo attribution */
  #dispose_logo = true;

  /** @var {object} ~ map sentiment label into its property: en label, color */
  static MAP_SENTIMENTS = {
    positif: {
      label: "Positive",
      color: "#7ddc67",
    },
    netral: {
      label: "Neutral",
      color: "#c8cdd0",
    },
    negatif: {
      label: "Negative",
      color: "#dc6967",
    },
  };

  static MAP_BOTS = {
    human: {
      label: "Human",
      color: "#6794dc",
    },
    unknown: {
      label: "Unknown",
      color: "#818181",
    },
    bot: {
      label: "Bot",
      color: "#dc6967",
    }
  }

  /** @var {object} ~ @see \App\Libraries\Platform::getStyles() */
  static MAP_PLATFORM = {
    instagram: {
      label: "Instagram",
      color: "rgba(188, 42, 141, 0.8)",
    },
    facebook: {
      label: "Facebook",
      color: "rgba(66, 103, 178, 0.8)",
    },
    twitter: {
      label: "X",
      color: "rgba(29, 161, 242, 0.8)",
    },
    x: {
      label: "X",
      color: "rgba(29, 161, 242, 0.8)",
    },
    tiktok: {
      label: "Tiktok",
      color: "rgba(0, 0, 0, 0.7)",
    },
    youtube: {
      label: "Youtube",
      color: "rgba(255, 0, 0, 0.8)",
    },
    threads: {
      label: "Threads",
      color: "rgb(91, 91, 91)",
    },
    media: {
      label: "Media",
      color: "rgb(205, 238, 71)",
    },
    blog: {
      label: "Blog",
      color: "rgb(180, 255, 203)",
    },
  }

  /** @var {object} */
  static DEFAULT_WORDCLOUD_HOVER_EFFECT = {
    idleBoxColor: "#ffffff",
    hoverBoxColor: "#ff621f",
    hoverTextColor: "#000000",
  };

  /** @var {array} */
  static DEFAULT_APP_COLORS = [
    '#026EB6',
    '#F26C51',
    '#017D89',
    '#FCCD3B',
    '#3EC0AE',
    '#A12616',
    '#22C0F0',
    '#AA8118',
    '#73B865',
    '#5F636C',
  ];

  /**
   * AMC constructor
   * @param {strong} chartId
   * @param {object} params of:
   * {
   *   chartOpts: {object},
   *   ?rootOpts: {object},
   *   ?themes: {array},
   * }
   */
  constructor(chartId, params) {
    this.chartId = chartId;
    params = params ?? {};
    this.chartOpts = params.chartOpts ?? {};
    this.#params = params;
    this.validateDependencies();
  }

  /**
   * Get Map Label of given datatype
   * @param {string} datatype
   * @return {Object|Object<string, {label: string, color: string}>}
   */
  static getMapLabel(datatype) {
    let result = {};

    switch (datatype) {
      case "bot":
        result = {...AMC.MAP_BOTS};
        break;
      case "sentimen": // intended without "t"
        result = {...AMC.MAP_SENTIMENTS};
        break;
      case "platform":
        result = {...AMC.MAP_PLATFORM};
        break;
      default:
        break;
    }

    return result;
  }

  /**
   * Get soda predefined color (from env)
   * @return {array<am5.Color>}
   */
  static getAppColors() {
    const App = window['App'] || {};
    const colors = App.colors || AMC.DEFAULT_APP_COLORS;
    return colors.map((val) => {
      const len = `${val}`.length;
      const color = !/^\#/.test(val) && [3, 6].indexOf(len) !== -1
        ? `#${val}`
        : `${val}`;
      return AMC.amColor(color);
    });
  }

  /**
   * Capitize first letter of given string
   * @param {string} string
   */
  static ucfirst(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }

  /**
   * Short hand of get AMCData to transform data
   */
  static dto(method, data) {
    return AMCData.get(method, data);
  }

  /**
   * Try generate am5.color of given color, on error try with failover
   * @param {string|int|am5.Color} color Eg. "#ffffff", 0xffffff
   * @param {string|int|am5.Color} failover
   * @return {am5.Color}
   */
  static amColor(color, failover) {
    let result = null;
    try {
      result = am5.color(color);
    } catch (e) {
      result = am5.color(failover ? failover : 0x000000);
    }
    return result;
  }

  /**
   * Parses a color string to extract the base color and its opacity.
   * Supports Hex (6/8/3/4 digits), legacy comma RGB/RGBA, and modern slash RGB.
   *
   * @param {string} colorInput E.g. "#ffffff", "#0000", "rgba(0, 0, 0, 0.5)"
   * @param {string} fallbackColor E.g. "#ffffff", "#0000", "rgba(0, 0, 0, 0.5)"
   * @return {{ color: am5.Color, opacity: number }}
   */
  static parseColorAndOpacity(colorInput, fallbackColor) {
    fallbackColor = fallbackColor ?? '#000000';
    let opacity = 1;
    let baseColor = String(colorInput || fallbackColor).trim().toLowerCase();

    // Auto correct hex without "#"
    baseColor = !baseColor.startsWith('rgb') && !baseColor.startsWith('#')
      ? `#${baseColor}`
      : baseColor;

    if (baseColor.startsWith('#')) {
      const hex = baseColor.substring(1);

      // Handle 4-digit (#RGBA) and 8-digit (#RRGGBBAA) hex codes
      if (hex.length === 4 || hex.length === 8) {
        const alphaHex = hex.length === 4
          ? hex.substring(3, 4).repeat(2)
          : hex.substring(6, 8);
        opacity = parseInt(alphaHex, 16) / 255;
        baseColor = '#' + (
          hex.length === 4 ? hex.substring(0, 3) : hex.substring(0, 6)
        );
      }
    }
    else if (baseColor.startsWith('rgb')) {
      const match = baseColor.match(/^rgba?\(([\s\S]+)\)$/i);

      if (match) {
        const content = match[1];
        const isModernSyntax = content.includes('/');
        const parts = isModernSyntax ? content.split('/') : content.split(',');
        const cleanedParts = parts.map(part => part.trim());

        if (cleanedParts.length === 4 && !isModernSyntax) {
          // Format: rgba(r, g, b, a)
          const alphaVal = cleanedParts[3];
          opacity = alphaVal.endsWith('%')
            ? parseFloat(alphaVal) / 100
            : parseFloat(alphaVal);
          baseColor = `rgb(${cleanedParts[0]}, ${cleanedParts[1]}, ${cleanedParts[2]})`;
        }
        else if (cleanedParts.length === 2 && isModernSyntax) {
          // Format: rgb(r g b / a)
          const rgbValues = cleanedParts[0].split(/\s+/).filter(Boolean);
          const alphaVal = cleanedParts[1];
          opacity = alphaVal.endsWith('%')
            ? parseFloat(alphaVal) / 100
            : parseFloat(alphaVal);
          baseColor = `rgb(${rgbValues.join(', ')})`;
        }
      }
    }
    else baseColor = fallbackColor;

    // Sanitize opacity to ensure it stays between 0 and 1
    opacity = Math.max(0, Math.min(1, isNaN(opacity) ? 1 : opacity));

    return {
      color: am5.color(baseColor),
      opacity: Number(opacity.toFixed(2))
    };
  }

  /**
   * Rebuild category if already exists in cachedList
   * @param {string} category
   * @param {string[]} cachedList
   * @param {number} maxLen max length of data
   * @returns {string}
   */
  static rebuildSuffixedCategory(category, cachedList = [], maxLen = 30) {
    if (!cachedList.includes(category)) return category;

    let isAvailable = !1;
    let appendId = 1;
    let newCategory = category;
    while (!isAvailable && appendId <= maxLen) {
      newCategory = `${category} (${appendId})`;
      if (!cachedList.includes(newCategory)) {
        isAvailable = !0;
      }
      appendId++;
    }
    return newCategory;
  };

  /**
   * Creates a rendering callback function for adaptive bar chart labels.
   * The generated function dynamically positions the label outside the bar (with dark text).
   * If there is insufficient space, it moves the value inside the bar (with light text).
   *
   * Used in:
   * - horizontalColumnTopMetric
   * - horizontalColumnTopReviews
   * - categoryVerticalColumn
   *
   * @param {Object} chartOpts - Configuration options for the chart.
   * @param {number|string} [chartOpts.labelFontSize] - The font size of the label.
   * @param {'vertical'|'horizontal'} [orientation='horizontal'] - The bar orientation.
   * @returns {Function} A callback that evaluates spatial bounds to render the text.
   */
  static createAdaptiveLabelRenderer(chartOpts, orientation = 'horizontal') {
    chartOpts = chartOpts || {};
    orientation = orientation || 'horizontal';

    return function(root, series, dataItem) {
      const dataSettings = dataItem.dataContext?.data_settings ?? {};
      const valueLabelsOpts = dataSettings.valueLabels ?? {};

      // Value labels is forced to not visible for this dataItem
      if (valueLabelsOpts.enabled === false) return undefined;

      const isHorizontal = orientation === 'horizontal';
      const baseAxis = series.get(isHorizontal ? 'xAxis' : 'yAxis');
      const baseMax = baseAxis.getPrivate("max", 1);

      const axisValue = isHorizontal ? 'valueX' : 'valueY'
      const axisLabelCenter = isHorizontal ? 'centerY' : 'centerX';
      const axisLabelAdapterCenter = isHorizontal ? 'centerX' : 'centerY';
      const axisLabelAdapterSpacing = isHorizontal ? 'dx' : 'dy';
      const axisLocation = isHorizontal ? 'locationX' : 'locationY';

      const valueLabelOpts = chartOpts.valueLabels ?? {};

      const fontSize = valueLabelOpts.fontSize ?? chartOpts.labelFontSize ?? undefined;

      /**
       * Get outer label fill color
       * @return {am5.Color}
       */
      let labelOuterFill = (() => {
        const colorObj = valueLabelOpts.outerFill
          ? AMC.parseColorAndOpacity(valueLabelOpts.outerFill)
          : undefined;
        return colorObj ? colorObj.color : am5.color(0x333333);
      })();

      /**
       * Get inner label fill color
       * @return {am5.Color}
       */
      let labelInnerFill = (() => {
        const colorObj = valueLabelOpts.innerFill
          ? AMC.parseColorAndOpacity(valueLabelOpts.innerFill)
          : undefined;
        return colorObj ? colorObj.color : am5.color(0x000000);
      })();

      let label = am5.Label.new(root, {
        [axisLabelCenter]: am5.p50,
        text: `{${axisValue}}`,
        fontSize,
        populateText: true
      });

      // Dynamically adjust anchor position (centerX or centerY)
      label.adapters.add(axisLabelAdapterCenter, function(centerAxis, target) {
        const item = target.dataItem;
        if (item) {
          const val = item.get(axisValue, 0);
          const ratio = val / baseMax;

          // If bar width is > 80% of the axis max, flip label inside
          return isHorizontal
            ? (ratio > 0.8 ? am5.p100 : am5.p0)
            : (ratio > 0.8 ? am5.p0 : am5.p100);
            // : am5.p0
        }
        return centerAxis;
      });

      // Dynamically adjust spacing/padding (dx or dy)
      label.adapters.add(axisLabelAdapterSpacing, function(dAxis, target) {
        const item = target.dataItem;
        if (item) {
          const val = item.get(axisValue, 0);

          // Push 5px left (inside) or 5px right (outside)
          return isHorizontal
            ? (val / baseMax > 0.8 ? -5 : 5)
            : dAxis;
        }
        return dAxis;
      });

      // Dynamically adjust text color for contrast
      label.adapters.add("fill", function(fill, target) {
        const item = target.dataItem;
        if (item) {
          const labelOpts = item.dataContext?.data_settings?.valueLabelOpts ?? {};
          labelInnerFill = (() => {
            const colorObj = labelOpts?.innerFill
              ? AMC.parseColorAndOpacity(labelOpts.innerFill)
              : undefined;
            return colorObj ? colorObj.color : labelInnerFill;
          })();
          labelOuterFill = (() => {
            const colorObj = labelOpts?.outerFill
              ? AMC.parseColorAndOpacity(labelOpts.outerFill)
              : undefined;
            return colorObj ? colorObj.color : labelOuterFill;
          })();
          const val = item.get(axisValue, 0);
          return (val / baseMax > 0.8) ? labelInnerFill : labelOuterFill;
        }
        return fill;
      });

      return am5.Bullet.new(root, {
        [axisLocation]: 1, // Always attach to the end of the bar
        sprite: label
      });
    };
  }

  /**
   * Get colors for series from chart options
   * @param {object} chartOpts
   * @returns {object} of:
   * {
   *   ?stroke: <am5Color>,
   *   ?fill: <am5Color>
   * }
   */
  static getSeriesColorFromOptions(chartOpts) {
    const seriesOpts = chartOpts.series ?? {};
    const strokeColor = seriesOpts.strokes?.color ?? undefined;
    const fillColor = seriesOpts.fills?.color ?? undefined;
    const colorOpts = {
      ...(strokeColor ? {stroke: am5.color(strokeColor)} : {}),
      ...(fillColor ? {fill: am5.color(fillColor)} : {}),
    };

    return colorOpts;
  }

  /**
   * Deep merge objects
   * This will try call public function;
   * failover call to protected method #deepMerge
   * @param {object} target The object to be merged into.
   * @param {object} source The object containing properties to merge from.
   * @return {object}
   */
  static deepMerge(target, source) {
    if (typeof window['deepMerge'] === 'function') {
      return window['deepMerge'](target, source);
    }

    return AMC.#deepMerge(target, source);
  }

  /**
   * Recursively merges properties of two objects.
   * Properties from the source object will overwrite those in the target object.
   * This is a deep merge, meaning nested objects are also merged, not just replaced.
   *
   * @param {object} target The object to be merged into.
   * @param {object} source The object containing properties to merge from.
   * @returns {object} A new object representing the merged result.
   */
  static #deepMerge(target, source) {
    const output = { ...target};

    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        if (
          typeof source[key] === 'object' &&
          source[key] !== null &&
          !Array.isArray(source[key])
        ) {
          if (target.hasOwnProperty(key) && typeof target[key] === 'object')
            output[key] = AMC.#deepMerge(target[key], source[key]);
          else output[key] = { ...source[key] };
        } else output[key] = source[key];
      }
    }

    return output;
  }

  /**
   * Return whether logo is diposes from property
   * @returns {bool}
   */
  isLogoDisposed() {
    return this.#dispose_logo;
  }

  /**
   * Check dependency for am5
   * @throws Error
   */
  validateDependencies() {
    if ('undefined' === typeof window['am5']) {
      throw new Error("Missing am5 lib");
    }
    if (!this.chartId) throw new Error("Missing required chartId");
    else {
      const chartId = this.chartId;
      if (!$(`#${chartId}`).length) {
        throw new Error(`Missing target chart element: #${chartId}`);
      }
    }
  }

  /**
   * Create root of given options
   * @param {object} opts of:
   * {
   *   ?chartId: {string},
   *   ?rootOpts: {object},
   *   ?themes: {array},
   * }
   * @return {am5.Root}
   */
  createRoot(opts) {
    opts = opts ? opts : this.#params;
    const chartOpts = this.chartOpts ?? {};
    const rootOpts = {...opts, ...(chartOpts.rootOpts)};

    const chartId = opts.chartId ? opts.chartId : this.chartId;
    this.disposeRoot(chartId);

    const root = am5.Root.new(chartId, rootOpts);
    if (this.#dispose_logo) root._logo.dispose();

    const themeOpts = [];

    if ("undefined" !== typeof window["am5themes_Animated"]) {
      if (chartOpts.animated ?? true) {
        themeOpts.push(am5themes_Animated.new(root));
      }
    }

    const myTheme = am5.Theme.new(root);
    if (chartOpts.labelFontSize)
      myTheme.rule("Label").set("fontSize", `${chartOpts.labelFontSize}`);

    const fontColor = chartOpts.labelFontColor
      ? AMC.amColor(chartOpts.labelFontColor, '#000')
      : undefined;
    if (fontColor) myTheme.rule("Label").set("fill", fontColor);
    themeOpts.push(myTheme);
    root.setThemes(themeOpts)

    if (!this.#root) this.#root = root;

    if ('function' === typeof chartOpts.onready) {
      let stoEnded;
      const callback = e => {
        if (stoEnded) clearTimeout(stoEnded);
        stoEnded = setTimeout(() => {
          root.events.off("frameended", callback);
          chartOpts.onready(e);
        }, 100)
      };
      root.events.on("frameended", callback);
    }

    return root;
  }

  /**
   * Dispose root of given id
   * @param {string|array} ids Chart Id
   */
  disposeRoot(ids) {
    ids = "string" === typeof ids
      ? (ids !== "*" ? ids.split(",") : "")
      : ids;
    if (!Array.isArray(ids)) {
      const msg = "[DisposeRoot]: Invalid given ids";
      throw new Error(msg);
    }
    am5.array.each(am5.registry.rootElements,
      (root) => {
        const domId = root && root.dom && root.dom.id
          ? root.dom.id
          : null;
        if (!domId) return !0;
        if (ids === "*" || ids.indexOf(root.dom.id) !== -1)
          root.dispose();
      }
    );
  }

  /**
   * Get or create root of given options
   * @param {object} opts @see createRoot
   * @return {am5.Root}
   */
  getRoot(opts) {
    return !opts && this.#root ? this.#root : this.createRoot(opts);
  }

  /**
   * Create XYChart of given options
   * @param {am5.Root} root
   * @param {object} opts
   * @return {am5.Chart}
   */
  createXYChart(root, opts) {
    if (!root) root = this.getRoot();
    const chartOpts = this.chartOpts ?? {};
    const defaultOpts = {
      panX: false,
      panY: false,
      pinchZoomX: false,
      paddingLeft: 0,
      ...(chartOpts.paddingBottomCredit
        ? { paddingBottom: parseInt(chartOpts.paddingBottomCredit) + 20 }
        : {}),
    };
    opts = opts ?? {};
    opts = { ...defaultOpts, ...opts };
    const chart = root.container.children.push(
      am5xy.XYChart.new(root, opts));
    if (chart) this.setChart(chart);

    return chart;
  }

  /**
   * Create Pie Chart of given options
   * @param {am5.Root} root
   * @param {object} opts
   * @return {am5.PieChart}
   */
  createPieChart(root, opts) {
    if (!root) root = this.getRoot();
    const chartOpts = this.chartOpts ?? {};
    const radius = chartOpts.radius ?? null;
    const innerRadius = chartOpts.innerRadius ?? 25;
    const defaultOpts = {
      ...(radius ? { radius: am5.percent(radius) } : {}),
      ...(innerRadius ? { innerRadius: am5.percent(innerRadius) } : {}),
      endAngle: 270,
      layout: root.verticalLayout
    };
    opts = opts ?? {};
    opts = AMC.deepMerge(defaultOpts, opts);
    const chart = root.container.children.push(
      am5percent.PieChart.new(root, opts));
    if (chart) this.setChart(chart);

    return chart;
  }

  /**
   * Create Radar Chart of given options
   * @param {am5.Root} root
   * @param {object} opts
   * @return {am5.RadarChart}
   */
  createRadarChart(root, opts) {
    if (!root) root = this.getRoot();
    const chartOpts = this.chartOpts ?? {};
    const radius = chartOpts.radius ?? null;
    const innerRadius = chartOpts.innerRadius ?? null;
    const defaultOpts = {
      ...(radius ? { radius: am5.percent(radius) } : {}),
      ...(innerRadius ? { innerRadius: am5.percent(innerRadius) } : {}),
      panX: false,
      panY: false,
      wheelX: "none",
      wheelY: "none"
    };
    opts = opts ?? {};
    opts = AMC.deepMerge(defaultOpts, opts);
    const chart = root.container.children.push(
      am5radar.RadarChart.new(root, opts));
    if (chart) this.setChart(chart);

    return chart;
  }

  /**
   * Set given chart
   * @param {am5.Chart} chart
   */
  setChart(chart) { this.#chart = chart; }

  /**
   * Get current chart
   * @return {am5.Chart|null}
   */
  getChart() { return this.#chart; }

  /**
   * Validate if given chart, series is an instanceof of class of am5
   * @param {string} type
   * @param {mixed} input
   * @param {string} calledBy
   * @throws Error
   */
  validate(type, input, TheClass, calledBy) {
    let msg = "";
    const prefix = `${calledBy ? `[${calledBy}]: ` : "*"}`;
    if (!input) {
      msg = `Missing ${type}`;
    }
    else {
      const isValidSeries = input instanceof TheClass;
      if (!isValidSeries) {
        const className = `am5.${AMC.ucfirst(type)}`;
        msg = `Given ${type} is not an instance of ${className}`;
      }
    }
    if (msg) throw new Error(`${prefix}${msg}`);
  }

  /**
   * Set DateAxis on xAxis 
   * @param {am5.Chart} chart
   * @param {object} opts
   * @return {am5.xAxis}
   */
  setXDateAxis(chart, opts) {
    chart = chart ? chart : this.#chart;
    this.validate('chart', chart, am5.Chart, 'setXDateAxis');
    opts = opts ?? {};
    const root = this.getRoot();
    const chartOpts = this.chartOpts ?? {};
    const xAxisOpts = chartOpts.xAxis ? chartOpts.xAxis : { tooltip: {} };
    const tooltipOpts = xAxisOpts.tooltip
      ? xAxisOpts.tooltip
      : { enabled: false };

    /** @var {object|bool} */
    const minorDateFormats = xAxisOpts.minorDateFormats ?? null;

    /** @var {bool} */
    const hasMinorGrid = [true, null].indexOf(minorDateFormats) !== -1 ||
      typeof minorDateFormats === 'object';

    const axisRendererXOpts = {
      minorGridEnabled: true,
      minGridDistance: 200,
      minorLabelsEnabled: hasMinorGrid,
      // minorLabelsEnabled: false,
    };
    const xRenderer = opts.renderer
      ? opts.renderer
      : am5xy.AxisRendererX.new(root, axisRendererXOpts);
    delete opts.renderer;
    const tooltipFormatOpts = tooltipOpts.enabled
      ? (tooltipOpts.format
        ? { tooltipDateFormat: tooltipOpts.format }
        : {})
      : {};
    const dateAxisParams = {
      baseInterval: {
        timeUnit: `${xAxisOpts.intervalUnit}`,
        count: 1
      },
      renderer: xRenderer,
      ...tooltipFormatOpts,
      ...opts,
    };

    if (xAxisOpts.tooltip.enabled)
      dateAxisParams.tooltip = am5.Tooltip.new(root, {});
    const xAxis = chart.xAxes.push(am5xy.DateAxis.new(root, dateAxisParams));
    if (xAxisOpts.categoryDateFormat) {
      const interval = xAxisOpts.intervalUnit ?? 'day';
      xAxis.set("dateFormats", {
        ...xAxis.get("dateFormats"),
        [interval]: `${xAxisOpts.categoryDateFormat}`,
      });
      xAxis.set("periodChangeDateFormats", {
        ...xAxis.get("periodChangeDateFormats"),
        [interval]: `[bold]${xAxisOpts.categoryDateFormat}[/]`,
      });
    }

    return xAxis;
  }

  /**
   * Set CategoryAxis on xAxis
   * @param {am5.Chart} chart
   * @param {object} opts
   * @return {am5.xAxis}
   */
  setXCategoryAxis(chart, opts) {
    chart = chart ? chart : this.#chart;
    this.validate('chart', chart, am5.Chart, 'setXCategoryAxis');
    opts = opts ?? {};
    const root = this.getRoot();
    const chartOpts = this.chartOpts ?? {};
    const xAxisOpts = chartOpts.xAxis ? chartOpts.xAxis : { tooltip: {} };
    const tooltipOpts = xAxisOpts.tooltip
      ? xAxisOpts.tooltip
      : { enabled: false };
    const xRenderer = opts.renderer
      ? opts.renderer
      : am5xy.AxisRendererX.new(root, {
        minorGridEnabled: true,
        minGridDistance: 200,
        minorLabelsEnabled: true,
      });
    delete opts.renderer;
    const tooltipFormatOpts = tooltipOpts.enabled
      ? (tooltipOpts.format
        ? { tooltipDateFormat: tooltipOpts.format }
        : {})
      : {};
    const axisParams = {
      maxDeviation: 0.3,
      categoryField: `${xAxisOpts.categoryField
        ?? chartOpts.categoryField ?? "category"}`,
      renderer: xRenderer,
      ...tooltipFormatOpts,
      ...opts,
    };
    if (xAxisOpts.tooltip.enabled)
      axisParams.tooltip = am5.Tooltip.new(root, {});
    const xAxis = chart.xAxes.push(am5xy.CategoryAxis.new(root, axisParams));
    return xAxis;
  }

  /**
   * Set yAxis 
   * @param {am5.Chart} chart
   * @param {object} opts
   * @return {am5.yAxis}
   */
  setYAxis(chart, opts) {
    chart = chart ? chart : this.#chart;
    this.validate('chart', chart, am5.Chart, 'setYAxis');
    opts = opts || {};
    const root = this.getRoot();
    const yRenderer = opts.renderer
      ? opts.renderer
      : am5xy.AxisRendererY.new(root, {});
    delete opts.renderer;
    const yAxis = chart.yAxes.push(am5xy.ValueAxis.new(root, {
      maxDeviation: 0.2,
      renderer: yRenderer,
      ...opts,
    }));
    return yAxis;
  }

  /**
   * Set cursor of given chart
   * @param {?am5.Chart} chart
   * @param {object} cursorOpts of Cursor options
   * @return {am5.Cursor|boolean}
   */
  setCursor(chart, opts) {
    chart = chart ? chart : this.#chart;
    this.validate('chart', chart, am5.Chart, 'setCursor');
    const cursorOpts = (this.chartOpts ?? { cursor: {} })['cursor'];
    const isEnabled = cursorOpts.enabled ?? true;
    if (!isEnabled) {
      chart.remove("cursor");
      return !1;
    }
    opts = opts ?? { behavior: "none" };
    opts = {
      ...opts,
      ...(cursorOpts.behavior ? { behavior: cursorOpts.behavior } : {}),
    };
    const visibleOpts = {
      lineX: true,
      lineY: true,
      ...(cursorOpts.visible ?? {}),
    };
    const cursor = chart.get("cursor") ??
      chart.set("cursor", am5xy.XYCursor.new(this.#root, opts));
    if (cursor) for (let line in visibleOpts)
      cursor[line].set("visible", visibleOpts[line])
    return cursor;
  }

  /**
   * Initialize separated legend
   * Make dom if it not exist
   */
  initiateSeparatedLegend() {
    const chartId = this.chartId;
    const $chart = $(`#${chartId}`);
    const $wchart = $chart.closest('.wrap-chart');
    const $relativeChart = $wchart.length > 0 ? $wchart : $chart;
    const legendId = `${chartId}-legend`;
    const isDisposedLogo = this.#dispose_logo;
    const layerClass = 'credit-layer';
    let $legend = $(`#${legendId}`);
    if (!$legend.length) {
      const legend_html = '' +
        '<div class="wrap-chartlegend">' +
          `<div class="chart-legend-outer">` +
            `<div id="${legendId}" class="chart-legend"></div>` +
            (isDisposedLogo ? `` : `<div class="${layerClass}"></div>`) + 
          `</div>` +
        `</div>`;
      $relativeChart.after(legend_html);
      $legend = $(`#${legendId}`);
    }
    else {
      if (isDisposedLogo) $legend.parent().find(`.${layerClass}`).remove();
    }
    return $legend;
  }

  /**
   * Set legend of given chart
   * @param {?am5.Chart} chart
   * @param {object} legendOpts
   * @return {am5.Legend|boolean}
   */
  setLegend(legendOpts) {
    const chartOpts = this.chartOpts ?? {};
    const paddingCredit = chartOpts.paddingBottomCredit ?? 0;
    const legendChartOpts = chartOpts.legend ?? {};
    if (!legendChartOpts.enabled) return !1;

    let legendId = '';
    let $legend = null;
    const isSeparated = legendChartOpts.separated;
    let legendParams = {
      centerX: am5.percent(50),
      x: am5.percent(50),
      useDefaultMarker: true,
      ...(!isSeparated
        ? { paddingLeft: chartOpts.paddingBottomCredit ?? 0 }
        : {}),
    };
    if (isSeparated) {
      $legend = this.initiateSeparatedLegend();
      legendId = $legend.attr('id');
      if (!$legend.length) {
        console.warn(`Separated legend element not found: #${legendId}`);
      }
      else {
        const $wrapLegend = $legend.closest('.wrap-chartlegend');
        // activate wrap-chartlegend
        $wrapLegend.addClass('active')
        if (paddingCredit > 0) {
          $wrapLegend.css('margin-top', `-${paddingCredit * .5}px`);
          const legendPadding = this.#dispose_logo
            ? 15
            : Math.floor(paddingCredit / 2);

          const paddingTop = legendChartOpts.paddingTop ??
            legendChartOpts.padding ?? legendPadding;

          const paddingBottom = legendChartOpts.paddingBottom ??
            legendChartOpts.padding ?? (this.#dispose_logo
              ? legendPadding
              : paddingCredit);
          legendParams = {
            ...legendParams,
            paddingTop,
            paddingBottom,
          };
        }
      }
    }
    else {
      const chartWidth = $(`#${this.chartId}`).width();
      const creditWidth = $(".credit-layer").width();
      const wPerc = creditWidth > 0
        ? (creditWidth / chartWidth) * 100
        : 0;
      const align = legendChartOpts.align ?? "center";
      const yPerc = chartOpts.paddingBottomCredit && align == "left"
        ? 97
        : 100;
      // force legend position to bottom
      legendParams = {
        ...legendParams,
        width: align === "center" ? "auto" : am5.percent(100),
        x: align === "center" ? am5.percent(50) : am5.percent(wPerc),
        centerX: am5.percent(align === "center" ? 50 : 0),
        // y: am5.percent(100),
        y: am5.percent(98.8),
        centerY: am5.percent(100),
      };
    }
    legendOpts = legendOpts ?? {};
    legendParams = {
      ...legendParams,
      ...legendChartOpts,
      ...legendOpts,
    };

    const lRoot = isSeparated
      ? this.createRoot({ ...this.#params, chartId: `${legendId}` })
      : this.getRoot();
    const mapLayout = {
      horizontal: 'horizontalLayout',
      vertical: 'verticalLayout',
      grid: 'gridLayout', // default ?
    };
    const layoutOpt = legendParams.layout ?? undefined;
    const rootLayout = mapLayout[layoutOpt] ?? undefined;
    let legendLayout;
    if (rootLayout) {
      const gridLayout = chartOpts.legend.gridLayout ?? {};
      legendLayout = layoutOpt === "grid" && gridLayout
        ? am5.GridLayout.new(lRoot, {
          // maxColumns: 3,
          fixedWidthGrid: true,
          ...gridLayout,
        })
        : lRoot[rootLayout];
    }
    if (legendLayout) legendParams.layout = legendLayout;
    else delete legendParams.layout;

    const legend = lRoot.container.children.push(
      am5.Legend.new(lRoot, legendParams)
    );

    // in case of items contained in narrow container
    // condensed items to avoid conflict with other elements
    if (legendParams.condensed) {
      legend.itemContainers.template.setAll({
        paddingTop: 0,
        paddingBottom: 0,
        marginTop: 0,
        marginBottom: 0
      });
    }

    if (!legendParams.labelValue.visible)
      legend.valueLabels.template.set("forceHidden", true);

    const markerSize = legendChartOpts.markers && legendChartOpts.markers.size
      ? legendChartOpts.markers.size
      : null;
    if (markerSize) {
      legend.markers.template.setAll({
        width: markerSize,
        height: markerSize,
        y: am5.percent(5)
      });
    }
    const fontSize = legendChartOpts.labels && legendChartOpts.labels.fontSize
      ? legendChartOpts.labels.fontSize
      : null;
    if (fontSize) legend.labels.template.setAll({fontSize});

    if (isSeparated && $legend && $legend.length) {
      legend.events.on("boundschanged", function () {
        $legend.css('height', `${legend.height()}px`);
      });
    }
    return legend;
  }

  /**
   * Get legend value text format
   * @return {string}
   */
  getLegendValueTextFormat() {
    const chartOpts = this.chartOpts ?? { legend: null };
    const legendVDefaults = {
      visible: true,
      fontSize: null,
      format: null,
      bold: true
    };
    const legendValueOpts = chartOpts.legend && chartOpts.legend.labelValue
      ? { ...legendVDefaults, ...chartOpts.legend.labelValue }
      : { ...legendVDefaults };
    const legendValueText = ((opts) => {
      if (!legendValueOpts.visible) return "";
      const attrs = [];
      if (opts.fontSize) attrs.push(`fontSize: ${opts.fontSize}px`);
      if (opts.bold) attrs.push(`bold`);
      const valueFormat = opts.format
        ? `.formatNumber('${opts.format}')`
        : '';
      const valueY = `{valueY${valueFormat}}`;
      return attrs.length ? `[${attrs.join(" ")}]${valueY}[/]` : `${valueY}`;
    })(legendValueOpts);
    return legendValueText;
  }

  /**
   * Set bullets of given series.
   * Assign events:
   * - click, of given chartOpts.onclick;
   * - hover, via scaleBulletOnCursorMove
   * @param {am5.Series}
   * @param {?undefined|object|array} data
   * @param {?undefined|am5.Chart} chart
   */
  setBullets(series, data, chart) {
    const bulletOpts = this.chartOpts.bullets ?? {
      enabled: true,
      hoverScale: 3, // {boolean|int}
    };
    const bulletEnabled = bulletOpts.enabled ?? true;
    if (!bulletEnabled) {
      series.data.setAll(data);
      return !1;
    }
    let hoverScale = bulletOpts.hoverScale ?? 3;
    if (hoverScale && typeof hoverScale === "boolean")
      hoverScale = 3;
    this.validate('series', series, am5.Series, 'setBullets');
    const root = this.getRoot();
    const chartOpts = this.chartOpts ?? {};
    const onClick = typeof chartOpts.onclick === "function"
      ? chartOpts.onclick
      : null;
    const bTemplate = onClick ? am5.Template.new(root) : undefined;
    if (bTemplate) bTemplate.events.on("click", e => { onClick(e) });
    const size = bulletOpts.size ?? 4;
    const shape = bulletOpts.shape ?? 'square';
    const customFields = ['enabled', 'size', 'shape', 'hoverScale'];
    let bulletsParams = { ...bulletOpts };
    Object.keys(bulletsParams).forEach((field) => {
      if (customFields.indexOf(field) !== -1) delete bulletsParams[field];
    });
    if (bulletsParams.strokeWidth > 0) {
      if (!bulletsParams.stroke) bulletsParams.stroke = series.get("stroke");
      if (!bulletsParams.fill) bulletsParams.fill = AMC.amColor(0xffffff);
    }
    const baseShapeOpts = {
      cursorOverStyle: `${onClick ? "pointer" : "default"}`,
      centerX: am5.percent(50),
      centerY: am5.percent(50),
      populateText: true,
      // stroke: series.get("stroke"),
      // strokeWidth: 2,
      fill: series.get("fill"),
      ...bulletsParams,
    };
    const shapeOpts = shape === 'square'
      ? {
        ...baseShapeOpts,
        width: size,
        height: size,
      }
      : {
        ...baseShapeOpts,
        radius: size,
      };
    series.bullets.push(function () {
      const sprite = shape === 'square'
        ? am5.Rectangle.new(root, { ...shapeOpts }, bTemplate)
        : am5.Circle.new(root, { ...shapeOpts }, bTemplate);
      sprite.states.create('hover', { scale: hoverScale });
      return am5.Bullet.new(root, {
        locationX: 0.5,
        locationY: 0.5,
        sprite,
      });
    });

    if (data) {
      series.data.setAll(data);
      this.scaleBulletOnCursorMove(chart);
    }
  }

  /**
   * Scale bullets on cursor moved.
   * Trigger after creating series and set data.
   * Require: cursor, tooltip, bullet.
   * @param {am5.Chart}
   * @return {boolean}
   */
  scaleBulletOnCursorMove(chart) {
    const bulletOpts = this.chartOpts.bullets ?? {
      enabled: true,
      hoverScale: 3,
    };
    const bulletEnabled = bulletOpts.enabled ?? true;
    let hoverScale = bulletOpts.hoverScale ?? 3;
    if (hoverScale && typeof hoverScale === "boolean")
      hoverScale = 3;
    const scaleOnHover = hoverScale > 1;
    if (!bulletEnabled || !scaleOnHover) return !1;
    chart = chart ? chart : this.#chart;
    this.validate('chart', chart, am5.Chart, 'scaleBulletOnCursorMove');
    const cursor = chart.get("cursor") ?? this.setCursor(chart);
    if (!cursor) return !1;

    // List of hovered bullets
    let prevBullets = [];

    const resetPrevBullets = () => {
      for (let i = 0; i < prevBullets.length; i++) {
        prevBullets[i].unhover();
      }
      return [];
    };
    cursor.events.on("cursormoved", () => {
      prevBullets = resetPrevBullets();
      chart.series.each((series) => {
        const tooltip = series.get("tooltip") ?? {};
        const dataItem = tooltip.dataItem ?? undefined;
        const bullets = dataItem && dataItem.bullets
          ? dataItem.bullets
          : [];
        if (bullets.length) {
          const sprite = bullets[0].get("sprite");
          sprite.hover();
          prevBullets.push(sprite);
        }
      });
    });
    cursor.events.on("cursorhidden", () => {
      resetPrevBullets()
    });
    return !0;
  }

  /**
   * Configure series element template of given series and opts
   * Set event onclick on columns bar with cursor: pointer.
   * @param {am5.Series} series
   * @param {?object} opts of:
   * {
   *   ?fills: {object},
   *   ?stroke: {object},
   *   ?onclick: {Function},
   * }
   * @return {boolean}
   */
  setSeriesTemplate(series, opts) {
    this.validate('series', series, am5.Series, 'setSeriesTemplate');
    const chartOpts = this.chartOpts ?? {};
    const seriesOpts = chartOpts.series ?? {};
    opts = {
      ...seriesOpts,
      ...(opts ?? {}),
    };
    const registeredFields = ['strokes', 'fills', 'columns'];
    registeredFields.forEach((field) => {
      if (!series[field]) return !0;
      let sOpts = opts[field] ?? {};
      if ("columns" === field) {
        const onClick = opts.onclick ? opts.onclick : chartOpts.onclick;
        if ("function" === typeof onClick) {
          sOpts = {
            ...sOpts,
            cursorOverStyle: 'pointer',
          };
          series[field].template.events.on("click", e => onClick(e));
        }
      }
      if (Object.keys(sOpts).length) {
        series[field].template.setAll(sOpts);
        if (['strokes', 'fills'].indexOf(field) !== -1) {
          const setField = sOpts.color
            ? `${field}`.substring(0, field.length - 1)
            : null;
          if (setField) series.set(setField, sOpts.color);
        }
      }
    });
    return !0;
  }

  /**
   * Set bullet label on max value
   * @param {am5.Series} series
   */
  setBulletLabelOnMaxValue(series) {
    this.validate('series', series, am5.Series, 'setBulletLabelOnMaxValue');
    const chartOpts = this.chartOpts ?? {};
    const yAxisOpts = chartOpts ?? {};
    const valueYField = yAxisOpts.valueYField ?? "value";
    let maxValue = 0;
    am5.array.each(series.dataItems, (dataItem) => {
      const context = dataItem.dataContext ?? {};
      const value = context[valueYField] ?? 0;
      if (value >= maxValue) maxValue = value;
    });
    const root = this.getRoot();
    series.bullets.push((event, chart, dataItem) => {
      const context = dataItem.dataContext ?? {};
      const value = context[valueYField] ?? 0;
      if (maxValue && value >= maxValue) {
        return am5.Bullet.new(root, {
          locationY: 1,
          sprite: am5.Label.new(root, {
            text: "[bold]{valueY}[/]",
            fill: am5.color(0x000000),
            centerY: 0,
            centerX: am5.p50,
            populateText: true
          })
        });
      }
    });
  }

  /**
   * Set series data processor of given series
   * @property {object} chartOpts xAxis.inputDateFormat
   * @param {am5.Series} series
   * @return {boolean}
   */
  setSeriesDataProcessor(series) {
    const chartOpts = this.chartOpts ?? {};
    const xAxisOpts = chartOpts.xAxis ? chartOpts.xAxis : {};
    if (!xAxisOpts.inputDateFormat) return !1;
    this.validate('series', series, am5.Series, 'setSeriesDataProcessor');
    series.data.processor = am5.DataProcessor.new(this.getRoot(), {
      dateFormat: `${xAxisOpts.inputDateFormat}`,
      dateFields: [`${xAxisOpts.categoryField}`],
    });
    return !0;
  }

  /**
   * Get or create zoomable container (for wordcloud)
   * @param {am5.Root} root
   * @return {am5.ZoomableContainer|am5.Container}
   */
  getOrCreateZoomableContainer(root) {
    if (!root) root = this.getRoot();

    const chartOpts = this.chartOpts ?? {};
    const wcOpts = chartOpts.wordcloud ?? {};
    const isZoomable = wcOpts.zoomable ?? false;
    if (!isZoomable) return root.container;

    const containerOptsDefault = {
      width: am5.p100,
      height: am5.p100,
      wheelable: true,
      pinchZoom: true
    };

    const zoomableContainer = root.container.children.push(
      am5.ZoomableContainer.new(root, containerOptsDefault));

    zoomableContainer.children.push(am5.ZoomTools.new(root, {
      target: zoomableContainer,
      buttons: [
        "zoomIn",
        "zoomOut"
      ]
    }));

    return zoomableContainer;
  }

  /**
   * Create wordcloud
   * @param {am5.Root} root
   * @return {am5.WordCloud}
   */
  createWordCloud(root) {
    if (!root) root = this.getRoot();

    const chartOpts = this.chartOpts ?? {};
    const defaultWordcloudOpts = {
      categoryField: "category",
      valueField: "value",
      angles: [0, -90],
      labels: {
        _colors: {
          tone: "default"
        },
      },
    };
    const wcOpts = AMC.deepMerge(defaultWordcloudOpts, chartOpts.wordcloud ?? {});

    const labelOpts = wcOpts.labels ?? defaultWordcloudOpts.labels;
    const colorOpts = labelOpts._colors ?? defaultWordcloudOpts.labels._colors;
    const tonesWithColorSet = ["default", "custom", "mono"];

    /** @type {boolean} */
    const isToneWithColorSet = tonesWithColorSet.includes(colorOpts.tone ?? '');

    /** @type {array} */
    const customColors = colorOpts.tone === "custom"
      ? (colorOpts.custom ?? [])
      : (colorOpts.tone === "mono"
        ? (colorOpts.mono ? [colorOpts.mono] : [])
        : []);

    const colorSetParams = {};
    if (customColors.length) {
      colorSetParams.colors = [];
      customColors
        .forEach(val => {
          const parsed = AMC.parseColorAndOpacity(val);
          if (parsed) colorSetParams.colors.push(parsed.color);
        });
    }
    const bgColorInput = wcOpts.isDarkmode ? '#272822' : (wcOpts.background ?? undefined);
    const bgOpacityInput = wcOpts.backgroundOpacity || undefined;

    /** @type {object|undefined} */
    const parsedBgColor = bgColorInput
      ? AMC.parseColorAndOpacity(bgColorInput)
      : undefined;

    const background = parsedBgColor
      ? am5.Rectangle.new(root, {
          fill: parsedBgColor.color,
          fillOpacity: bgOpacityInput || parsedBgColor.opacity,
        })
      : undefined;

    /** @type {am5.Percent|undefined} */
    const minFontSize = (() => {
      let fontSize = wcOpts.minFontSize ?? undefined;
      if (fontSize) {
        fontSize = Number(fontSize);
        fontSize = fontSize >= 1 && fontSize <= 100
          ? am5.percent(fontSize)
          : undefined;
      }
      return fontSize;
    })();

    /** @type {am5.Percent|undefined} */
    const maxFontSize = (() => {
      let fontSize = wcOpts.maxFontSize ?? undefined;
      if (fontSize) {
        fontSize = Number(fontSize);
        fontSize = fontSize >= 1 && fontSize <= 100
          ? am5.percent(fontSize)
          : undefined;
      }
      return fontSize;
    })();

    // @see https://www.amcharts.com/docs/v5/reference/wordcloud/#Settings
    const wcParams = {
      background,
      categoryField: wcOpts.categoryField,
      valueField: wcOpts.valueField,
      angles: wcOpts.angles ?? [0],
      minFontSize,
      maxFontSize,
      // maxCount,
      // minWordLength,
      // shapeTolerance: 0.85,
      // randomness: 0,
      ...(colorOpts.tone === "heat" ? { calculateAggregates: true } : {}),
      ...(isToneWithColorSet
        ? { colors: am5.ColorSet.new(root, colorSetParams) }
        : {}),
    };

    return am5wc.WordCloud.new(root, wcParams);
  }

  /**
   * Adjust word cloud labels opts:
   * - assign events: onclick, hover
   * @param {am5.Series} series
   * @param {object} opts
   */
  setWordCloudLabel(series, opts) {
    this.validate('series', series, am5.Series, 'setWordCloudLabel');
    const chartOpts = this.chartOpts ?? {};
    const defColors = AMC.DEFAULT_WORDCLOUD_HOVER_EFFECT;
    const defaultHoverEffect = {
      enabled: true,
      ...AMC.DEFAULT_WORDCLOUD_HOVER_EFFECT,
    };

    const wcOpts = chartOpts.wordcloud ?? {
      categoryField: "category",
      valueField: "value",
      onclick: undefined,
    };
    const tooltipText = `{${wcOpts.categoryField}}: [bold]{${wcOpts.valueField}}[/]`;
    const defaultLabelOpts = {
      _colors: { tone: "default" },
      _hoverEffect: { ...defaultHoverEffect },
      _tooltip: {
        enabled: true,
        text: `{${wcOpts.categoryField}}: [bold]{${wcOpts.valueField}}[/]`,
      },
    };
    wcOpts.labels = wcOpts.labels ?? { ...defaultLabelOpts };
    const labelOpts = wcOpts.labels ?? { ...defaultLabelOpts };
    const colorOpts = labelOpts._colors ?? { ...defaultLabelOpts._colors };
    const tooltipOpts = labelOpts._tooltip ?? { ...defaultLabelOpts._tooltip };
    // ############
    // # heatColors
    // ############
    if (colorOpts.tone === "heat") {
      const defaultHeatColors = {
        min: am5.color(0xffd4c2),
        max: am5.color(0xff621f)
      };
      const heatColors = colorOpts.heat ?? { ...defaultHeatColors };
      series.set("heatRules", [{
        target: series.labels.template,
        dataField: `${wcOpts.valueField}`,
        min: AMC.amColor(heatColors.min, defaultHeatColors.min),
        max: AMC.amColor(heatColors.max, defaultHeatColors.max),
        key: "fill",
      }]);
    }
    // ############
    // # highlight
    // ############
    else if (colorOpts.tone === 'highlight') {
      series.labels.template.setAll({
        templateField: "labelSettings",
      });
    }

    // ############
    // # onclick
    // ############
    const onClick = wcOpts.onclick ?? null;
    opts = opts ?? {};
    opts = {
      ...((_labelOpts) => {
        const newOpts = {};
        Object.keys(_labelOpts)
          .filter((field) => field[0] !== "_")
          .forEach((field) => newOpts[field] = _labelOpts[field]);
        return newOpts;
      })(labelOpts),
      ...{ cursorOverStyle: `${onClick ? "pointer" : "default"}` },
      ...(tooltipOpts.enabled
        ? {
          tooltipText: tooltipOpts.text
            ? tooltipOpts.text
            : defaultLabelOpts._tooltip.text
        }
        : {}),
      ...opts,
    };
    if (typeof onClick === "function") {
      series.labels.template.events.on("click", e => {
        onClick(e)
      });
    }

    // #############
    // #hover-effect
    // #############
    const hovOpts = labelOpts._hoverEffect ?? { ...defaultHoverEffect };
    if (!!hovOpts.enabled) {
      opts = {
        ...opts, ...{
          setStateOnChildren: true,
          interactive: true,
        }
      };
      series.labels.template.setup = (target) => {
        const boxType = hovOpts.boxRounded
          ? 'RoundedRectangle'
          : 'Rectangle';
        const roundedBox = am5[boxType].new(this.getRoot(), {
          fill: AMC.amColor(hovOpts.idleBoxColor, defColors.idleBoxColor),
        });
        const bg = target.set("background", roundedBox);
        const hoverBoxColor = AMC.amColor(hovOpts.hoverBoxColor, defColors.hoverBoxColor);
        bg.states.create("hover", {
          fill: AMC.amColor(hovOpts.hoverBoxColor, defColors.hoverBoxColor),
        });
      };
      series.labels.template.states.create("hover", {
        fill: AMC.amColor(hovOpts.hoverTextColor, defColors.hoverTextColor),
      });
    }
    series.labels.template.setAll(opts);
  }
};
// end: AMC
