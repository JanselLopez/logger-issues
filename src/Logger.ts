import { LogData, Route } from "./@types";

abstract class Logger {
  protected token: string = "";
  protected repoOwner: string = "owner";
  protected repoName: string = "repo";
  protected prod?: boolean;
  protected times: { [key: string]: number } = {};
  protected onError?: (error: LogData) => void;
  protected onWarn?: (warning: LogData) => void;
  constructor(
    token: string,
    repoOwner: string,
    repoName: string,
    prod = false,
    onError?: (error: LogData) => void,
    onWarn?: (warning: LogData) => void
  ) {
    Object.assign(this, {
      token,
      repoOwner,
      repoName,
      prod,
      onError,
      onWarn,
    });
  }
  protected objectToTable(obj: LogData) {
    if (!obj) {
      return "";
    }
    let table = "";
    let headers = "";
    let dividers = "";
    let rows = "";
    const keys = Object.keys(obj);
    keys.forEach((key, idx) => {
      headers += `|${key}`;
      dividers += `|---`;
      rows += `|${this.valueToString(obj[key])}`;
      if (idx === keys.length - 1) {
        headers += `|\n`;
        dividers += `|\n`;
        rows += `|\n`;
      }
    });
    if (keys.length) {
      table += headers;
      table += dividers;
      table += rows;
    }
    return table;
  }
  protected routesToTable(routes: Route[] = []) {
    const headers = `\n|name|params|\n`;
    const dividers = `|---|---|\n`;
    let rows = "";
    routes.forEach(({ name, params }) => {
      rows += `|${name}|${this.valueToString(params)}|\n`;
    });
    return headers + dividers + rows;
  }
  protected valueToString(value: any) {
    if (!value) {
      return value;
    }
    if (!value.toString || value.toString() === "[object Object]") {
      value = JSON.stringify(value);
    } else {
      value = value.toString();
    }
    return value;
  }
  protected valueToIssue(value: LogData) {
    let title: string = "";
    let body: string = "";
    if (value instanceof Error) {
      title = `Error ${value.message}`;
      body = value.stack + "\n";
    } else if (typeof value === "string") {
      title = value;
    } else if (value.title || value.body) {
      title = value.title;
      body = value.body;
    } else {
      title = this.valueToString(value);
      body = this.valueToString(value);
    }

    return { title, body };
  }
  protected generateTitleAndBody = (
    title: any,
    body: any,
    data: { [key: string]: any } = {},
    routes: Route[] = []
  ) => {
    title = this.valueToString(title);
    body = this.valueToString(body);
    if (Object.keys(data).length) {
      body += "\n## Important Data\n";
      const table = this.objectToTable(data);
      body += table;
    }
    if (routes.length) {
      body += "\n## Routes\n";
      const history = this.routesToTable(routes);
      body += history;
    }
    return { title, body };
  };
  l(message: any, ...params: any[]) {
    if (!this.prod) {
      console.log(message, ...params);
    }
  }
  d(message: any, ...params: any[]) {
    if (!this.prod) {
      console.debug(message, ...params);
    }
  }
  async w({
    warning,
    isIssue = false,
    data = {},
    routes = [],
    labels = [],
  }: {
    warning: LogData;
    isIssue?: boolean;
    data?: { [key: string]: any };
    routes?: Route[];
    labels?: string[] | number[];
  }) {
    if (!this.prod) {
      console.warn(warning);
      return;
    }
    this.onWarn?.(warning);
    if (isIssue) {
      const { title, body } = this.valueToIssue(warning);
      this.issue({ title, body, data, routes, labels });
    }
  }
  async e({
    error,
    data = {},
    routes = [],
    labels = [],
  }: {
    error: LogData;
    data?: { [key: string]: any };
    routes?: Route[];
    labels?: string[] | number[];
  }) {
    if (!this.prod) {
      console.error(error, data);
      return;
    }
    this.onError?.(error);
    const { title, body } = this.valueToIssue(error);
    await this.issue({ title, body, data, routes, labels });
  }
  ts(label: string, isIssue: boolean = false) {
    if (!this.prod) {
      console.time(label);
      return;
    }
    if (isIssue) {
      this.times[label] = performance.now();
    }
  }
  async te(label: string) {
    if (!this.prod) {
      console.timeEnd(label);
      return;
    }
    if (this.times[label]) {
      const time = (performance.now() - this.times[label]).toFixed(3) + "ms";
      delete this.times[label];
      await this.issue({ title: label + ` ${time}`, body: time });
    }
  }
  async ai(content:string):Promise<string|undefined> {
    const resAi = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization:
            "Bearer ",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "meta-llama/llama-3.3-70b-instruct:free",
          messages: [
            {
              role: "system",
              content:
                "Act as an expert troubleshooter and problem-solving assistant in a javascript project. Your role is to analyze issues described by users and provide clear, actionable solutions",
            },
            {
              role: "user",
              content
            },
          ],
        }),
      }
    );
    const dataAi = (await resAi.json()) as any;
    return dataAi?.choices?.[0]?.message?.content
  }
  abstract issue(params: {
    title: any;
    body: any;
    data?: { [key: string]: any };
    routes?: Route[];
    labels?: string[] | number[];
  }): Promise<void>;
}

export default Logger;
