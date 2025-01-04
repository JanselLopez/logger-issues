import { Octokit } from "octokit";
import { LogData, Route } from "./@types";
import Logger from "./Logger";

class GithubLogger extends Logger {
  constructor(
    token: string,
    repoOwner: string,
    repoName: string,
    prod = false,
    onError?: (error: LogData) => void,
    onWarn?: (error: LogData) => void
  ) {
    try {
      if (!token || token.length === 0) {
        throw new Error(
          `Create a personal access token at https://github.com/settings/tokens/new?scopes=repo`
        );
      }
      super(token, repoOwner, repoName, prod, onError, onWarn);
    } catch (error: any) {
      console.error("GITHUB_LOGGER: CONSTRUCTOR : ", error.message);
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
    data: { [key: string]: any };
    routes: Route[];
    labels?: string[];
  }) {
    try {
      const { title: issueTitle, body: issueBody } = this.generateTitleAndBody(
        title,
        body,
        data,
        routes
      );

      const octokit = new Octokit({ auth: this.token });
      await octokit.rest.issues.create({
        owner: this.repoOwner,
        repo: this.repoName,
        title: issueTitle,
        body: issueBody,
        assignees: [this.repoOwner],
        labels,
      });
    } catch (error) {
      console.error(
        "GITHUB_LOGGER: ERROR_CREATING_ISSUE: ",
        (error as Error).message
      );
    }
  }
}
export default GithubLogger;
