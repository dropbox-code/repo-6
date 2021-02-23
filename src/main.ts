import * as core from "@actions/core";
import * as github from "@actions/github";

async function run() {
  try {
    core.info("Starting autoapprove action.")
    const token = core.getInput("github-token", { required: true });

    const { pull_request: pr } = github.context.payload;
    if (!pr) {
      throw new Error("Event payload missing `pull_request`");
    }
    
    const octokit = github.getOctokit(token)

    core.info("Checking if PR is already merged.")
    const pullRequest = await octokit.pulls.get({
      owner: github.context.repo.owner,
      repo: github.context.repo.repo,
      pull_number: pr.number
    });
    if(pullRequest.data.merged){
      core.info(`Pull request ${pr.number} of repo ${github.context.repo.repo} already merged, exiting.`);
      return;
    }
    
    const username = (await octokit.users.getAuthenticated()).data.login;
    core.info(`Checking if PR is already approved by ${username}.`)
    const reviews = await octokit.pulls.listReviews({
      owner: github.context.repo.owner,
      repo: github.context.repo.repo,
      pull_number: pr.number
    });
    for(var review of reviews.data){
      if(review.user && review.user.login === username && review.state === "APPROVED"){
        core.info(`Skip the PR approval since it was already approved by ${username}.`);
        return;
      }
    }

    core.info(`Auto approving PR ${pr.number} since it is not already merged nor already approved by this user ${username}.`);
    await octokit.pulls.createReview({
      owner: github.context.repo.owner,
      repo: github.context.repo.repo,
      pull_number: pr.number,
      event: "APPROVE"
    });
  } catch (error) {
    console.log(error)
    core.setFailed(error.message);
  }
}

run();