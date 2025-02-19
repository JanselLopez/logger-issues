import { LogData, Route } from "./@types";
import Logger from "./Logger";

class GiteaLogger extends Logger {
  private host: string = "gitea.your.host";
  constructor(
    token: string,
    host: string,
    repoOwner: string,
    repoName: string,
    prod = false,
    onError?: (error: LogData) => void,
    onWarn?: (error: LogData) => void
  ) {
    try {
      if (!token || token.length === 0) {
        throw new Error(
          `Create a personal access token at https://gitea.your.host/user/settings/applications`
        );
      }
      super(token, repoOwner, repoName, prod, onError, onWarn);
      this.host = host;
    } catch (error: any) {
      console.error("GITEA_LOGGER: CONSTRUCTOR : ", error.message);
    }
  }
  async issue({
    title,
    body,
    data = {},
    routes = [],
    labels = [],
  }: {
    title: any;
    body: any;
    data?: { [key: string]: any };
    routes?: Route[];
    labels?: number[];
  }) {
    const {title:issueTitle,body:issueBody} = this.generateTitleAndBody(title, body,data,routes)
    try {
      const res = await fetch(
        `https://${this.host}/api/v1/repos/${this.repoOwner}/${this.repoName}/issues?access_token=${this.token}`,
        {
          method: "POST",
          headers: {
            accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title:issueTitle,
            body:issueBody,
            labels,
          }),
        }
      );
      const dataIssue = (await res.json()) as any;
      const aiAnswer = await this.ai(`
        ${issueTitle}\n
        ${issueBody}
      `);
      if (aiAnswer) {
        await fetch(
          `https://${this.host}/api/v1/repos/${this.repoOwner}/${this.repoName}/issues/${dataIssue?.number}/comments?access_token=${this.token}`,
          {
            method: "POST",
            headers: {
              accept: "application/json",
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              body: aiAnswer,
            }),
          }
        );
      }
    } catch (error) {
      console.error(
        "GITEA_LOGGER: ERROR_CREATING_ISSUE: ",
        (error as Error).message
      );
    }
  }
}
export default GiteaLogger;
