import { readVarT } from '@execonline-inc/environment';
import { get, HttpError, post, toHttpTask } from 'ajaxios';
import Task from 'taskarian';
import {
  githubDecoder,
  Github,
  HandlerFail,
  quoteDecoder,
  SlackMessage,
  SlackNotificationSuccess,
  SlackNotifierRequestFailed,
  slackNotifierRequestFailed,
  slackNotifierRequestSucceded,
  SuccessLambdaResult,
  ZenQuote,
  eventDecodeFailed,
} from './Types';
import { Result } from 'resulty';

export const toTask = <E, T>(result: Result<E, T>): Task<E, T> =>
  result.cata({
    Ok: Task.succeed,
    Err: Task.fail,
  }) as Task<E, T>;

const href: string = 'https://zenquotes.io/api/random';

const getZenQuote = (): Task<HttpError, ZenQuote> =>
  toHttpTask(get(href).withDecoder(quoteDecoder));

const buildRequestT = (slackMessage: SlackMessage): Task<HttpError, unknown> =>
  toHttpTask(
    post(slackMessage.slackWebhookUrl).withData({
      text: `quoote: ${slackMessage.zenQuote.quote}, link: ${slackMessage.github.eventG.pullRequest.self.href}`,
      channel: slackMessage.slackChannel,
      username: slackMessage.slackUser,
    })
  );

const postQuoteToSlack = (
  slackMessage: SlackMessage
): Task<SlackNotifierRequestFailed, SlackNotificationSuccess> =>
  buildRequestT(slackMessage)
    .mapError(slackNotifierRequestFailed)
    .map(slackNotifierRequestSucceded);

// Need to configure env variables (maybe make this a lambda first for local testing)

// return unless github.event.action == "unlabeled"
// return unless github.event.label.name == "Needs Review"
// author = github.event.pull_request.user.login
// authors = { costajohnt: 'costajohnt' }
// slack_name = authors.fetch(author.to_sym)
// link_to_pr = github.event.pull_request._links.self
// *send direct message to slack notifying user that needs review label has been removed with PR name and link
// (make another action that notifies user when PR is approved)

const decodeEvent = (event: unknown): Task<HandlerFail, Github> =>
  toTask(githubDecoder.decodeAny(event).mapError<HandlerFail>(eventDecodeFailed));

const messageIfApplicable = (github: Github): Task<HandlerFail, SuccessLambdaResult> =>
  github.eventG.action === 'unlabeled' && github.eventG.label.name === 'invalid'
    ? Task.succeed<HandlerFail, SuccessLambdaResult>(slackNotifierRequestSucceded('ok'))
    : Task.succeed<HandlerFail, {}>({})
        .assign('github', Task.succeed(github))
        .assign('zenQuote', getZenQuote())
        .assign('slackChannel', readVarT('SLACK_CHANNEL'))
        .assign('slackUser', readVarT('SLACK_USER'))
        .assign('slackWebhookUrl', readVarT('SLACK_WEBHOOK_URL'))
        .andThen(postQuoteToSlack);

const sampleEvent = {
  token: '***',
  job: 'printJob',
  ref: 'refs/pull/1/merge',
  sha: 'cbc0a6d050681cd84ae3e5f4046cd1a9b9da1bd8',
  repository: 'costajohnt/github-slack-tooling',
  repository_owner: 'costajohnt',
  repository_owner_id: '14304404',
  repositoryUrl: 'git://github.com/costajohnt/github-slack-tooling.git',
  run_id: '3178501750',
  run_number: '1',
  retention_days: '90',
  run_attempt: '1',
  artifact_cache_size_limit: '10',
  repository_visibility: 'public',
  repository_id: '545194132',
  actor_id: '14304404',
  actor: 'costajohnt',
  triggering_actor: 'costajohnt',
  workflow: 'Pull Request Workflow',
  head_ref: 'testing-workflow',
  base_ref: 'main',
  event_name: 'pull_request',
  event: {
    action: 'unlabeled',
    label: {
      color: 'e4e669',
      default: true,
      description: "This doesn't seem right",
      id: 4611004909,
      name: 'invalid',
      node_id: 'LA_kwDOIH8AlM8AAAABEtZZ7Q',
      url: 'https://api.github.com/repos/costajohnt/github-slack-tooling/labels/invalid',
    },
    number: 1,
    pull_request: {
      _links: {
        comments: {
          href: 'https://api.github.com/repos/costajohnt/github-slack-tooling/issues/1/comments',
        },
        commits: {
          href: 'https://api.github.com/repos/costajohnt/github-slack-tooling/pulls/1/commits',
        },
        html: {
          href: 'https://github.com/costajohnt/github-slack-tooling/pull/1',
        },
        issue: {
          href: 'https://api.github.com/repos/costajohnt/github-slack-tooling/issues/1',
        },
        review_comment: {
          href: 'https://api.github.com/repos/costajohnt/github-slack-tooling/pulls/comments{/number}',
        },
        review_comments: {
          href: 'https://api.github.com/repos/costajohnt/github-slack-tooling/pulls/1/comments',
        },
        self: {
          href: 'https://api.github.com/repos/costajohnt/github-slack-tooling/pulls/1',
        },
        statuses: {
          href: 'https://api.github.com/repos/costajohnt/github-slack-tooling/statuses/46590f9c42510c73c7ae48fd714a384c192eb48f',
        },
      },
      active_lock_reason: null,
      additions: 11,
      assignee: null,
      assignees: [],
      author_association: 'OWNER',
      auto_merge: null,
      base: {
        label: 'costajohnt:main',
        ref: 'main',
        repo: {
          allow_auto_merge: false,
          allow_forking: true,
          allow_merge_commit: true,
          allow_rebase_merge: true,
          allow_squash_merge: true,
          allow_update_branch: false,
          archive_url:
            'https://api.github.com/repos/costajohnt/github-slack-tooling/{archive_format}{/ref}',
          archived: false,
          assignees_url:
            'https://api.github.com/repos/costajohnt/github-slack-tooling/assignees{/user}',
          blobs_url: 'https://api.github.com/repos/costajohnt/github-slack-tooling/git/blobs{/sha}',
          branches_url:
            'https://api.github.com/repos/costajohnt/github-slack-tooling/branches{/branch}',
          clone_url: 'https://github.com/costajohnt/github-slack-tooling.git',
          collaborators_url:
            'https://api.github.com/repos/costajohnt/github-slack-tooling/collaborators{/collaborator}',
          comments_url:
            'https://api.github.com/repos/costajohnt/github-slack-tooling/comments{/number}',
          commits_url: 'https://api.github.com/repos/costajohnt/github-slack-tooling/commits{/sha}',
          compare_url:
            'https://api.github.com/repos/costajohnt/github-slack-tooling/compare/{base}...{head}',
          contents_url:
            'https://api.github.com/repos/costajohnt/github-slack-tooling/contents/{+path}',
          contributors_url:
            'https://api.github.com/repos/costajohnt/github-slack-tooling/contributors',
          created_at: '2022-10-04T00:13:47Z',
          default_branch: 'main',
          delete_branch_on_merge: false,
          deployments_url:
            'https://api.github.com/repos/costajohnt/github-slack-tooling/deployments',
          description: 'Github action that notifies developer when their code has been reviewed',
          disabled: false,
          downloads_url: 'https://api.github.com/repos/costajohnt/github-slack-tooling/downloads',
          events_url: 'https://api.github.com/repos/costajohnt/github-slack-tooling/events',
          fork: false,
          forks: 0,
          forks_count: 0,
          forks_url: 'https://api.github.com/repos/costajohnt/github-slack-tooling/forks',
          full_name: 'costajohnt/github-slack-tooling',
          git_commits_url:
            'https://api.github.com/repos/costajohnt/github-slack-tooling/git/commits{/sha}',
          git_refs_url:
            'https://api.github.com/repos/costajohnt/github-slack-tooling/git/refs{/sha}',
          git_tags_url:
            'https://api.github.com/repos/costajohnt/github-slack-tooling/git/tags{/sha}',
          git_url: 'git://github.com/costajohnt/github-slack-tooling.git',
          has_downloads: true,
          has_issues: true,
          has_pages: false,
          has_projects: true,
          has_wiki: true,
          homepage: null,
          hooks_url: 'https://api.github.com/repos/costajohnt/github-slack-tooling/hooks',
          html_url: 'https://github.com/costajohnt/github-slack-tooling',
          id: 545194132,
          is_template: false,
          issue_comment_url:
            'https://api.github.com/repos/costajohnt/github-slack-tooling/issues/comments{/number}',
          issue_events_url:
            'https://api.github.com/repos/costajohnt/github-slack-tooling/issues/events{/number}',
          issues_url:
            'https://api.github.com/repos/costajohnt/github-slack-tooling/issues{/number}',
          keys_url: 'https://api.github.com/repos/costajohnt/github-slack-tooling/keys{/key_id}',
          labels_url: 'https://api.github.com/repos/costajohnt/github-slack-tooling/labels{/name}',
          language: null,
          languages_url: 'https://api.github.com/repos/costajohnt/github-slack-tooling/languages',
          license: null,
          merge_commit_message: 'PR_TITLE',
          merge_commit_title: 'MERGE_MESSAGE',
          merges_url: 'https://api.github.com/repos/costajohnt/github-slack-tooling/merges',
          milestones_url:
            'https://api.github.com/repos/costajohnt/github-slack-tooling/milestones{/number}',
          mirror_url: null,
          name: 'github-slack-tooling',
          node_id: 'R_kgDOIH8AlA',
          notifications_url:
            'https://api.github.com/repos/costajohnt/github-slack-tooling/notifications{?since,all,participating}',
          open_issues: 1,
          open_issues_count: 1,
          owner: {
            avatar_url: 'https://avatars.githubusercontent.com/u/14304404?v=4',
            events_url: 'https://api.github.com/users/costajohnt/events{/privacy}',
            followers_url: 'https://api.github.com/users/costajohnt/followers',
            following_url: 'https://api.github.com/users/costajohnt/following{/other_user}',
            gists_url: 'https://api.github.com/users/costajohnt/gists{/gist_id}',
            gravatar_id: '',
            html_url: 'https://github.com/costajohnt',
            id: 14304404,
            login: 'costajohnt',
            node_id: 'MDQ6VXNlcjE0MzA0NDA0',
            organizations_url: 'https://api.github.com/users/costajohnt/orgs',
            received_events_url: 'https://api.github.com/users/costajohnt/received_events',
            repos_url: 'https://api.github.com/users/costajohnt/repos',
            site_admin: false,
            starred_url: 'https://api.github.com/users/costajohnt/starred{/owner}{/repo}',
            subscriptions_url: 'https://api.github.com/users/costajohnt/subscriptions',
            type: 'User',
            url: 'https://api.github.com/users/costajohnt',
          },
          private: false,
          pulls_url: 'https://api.github.com/repos/costajohnt/github-slack-tooling/pulls{/number}',
          pushed_at: '2022-10-04T00:33:17Z',
          releases_url:
            'https://api.github.com/repos/costajohnt/github-slack-tooling/releases{/id}',
          size: 0,
          squash_merge_commit_message: 'COMMIT_MESSAGES',
          squash_merge_commit_title: 'COMMIT_OR_PR_TITLE',
          ssh_url: 'git@github.com:costajohnt/github-slack-tooling.git',
          stargazers_count: 0,
          stargazers_url: 'https://api.github.com/repos/costajohnt/github-slack-tooling/stargazers',
          statuses_url:
            'https://api.github.com/repos/costajohnt/github-slack-tooling/statuses/{sha}',
          subscribers_url:
            'https://api.github.com/repos/costajohnt/github-slack-tooling/subscribers',
          subscription_url:
            'https://api.github.com/repos/costajohnt/github-slack-tooling/subscription',
          svn_url: 'https://github.com/costajohnt/github-slack-tooling',
          tags_url: 'https://api.github.com/repos/costajohnt/github-slack-tooling/tags',
          teams_url: 'https://api.github.com/repos/costajohnt/github-slack-tooling/teams',
          topics: [],
          trees_url: 'https://api.github.com/repos/costajohnt/github-slack-tooling/git/trees{/sha}',
          updated_at: '2022-10-04T00:13:47Z',
          url: 'https://api.github.com/repos/costajohnt/github-slack-tooling',
          use_squash_pr_title_as_default: false,
          visibility: 'public',
          watchers: 0,
          watchers_count: 0,
          web_commit_signoff_required: false,
        },
        sha: '3bb7caa1ceefd1d040cd00dc80fde8e9dc6a2bbc',
        user: {
          avatar_url: 'https://avatars.githubusercontent.com/u/14304404?v=4',
          events_url: 'https://api.github.com/users/costajohnt/events{/privacy}',
          followers_url: 'https://api.github.com/users/costajohnt/followers',
          following_url: 'https://api.github.com/users/costajohnt/following{/other_user}',
          gists_url: 'https://api.github.com/users/costajohnt/gists{/gist_id}',
          gravatar_id: '',
          html_url: 'https://github.com/costajohnt',
          id: 14304404,
          login: 'costajohnt',
          node_id: 'MDQ6VXNlcjE0MzA0NDA0',
          organizations_url: 'https://api.github.com/users/costajohnt/orgs',
          received_events_url: 'https://api.github.com/users/costajohnt/received_events',
          repos_url: 'https://api.github.com/users/costajohnt/repos',
          site_admin: false,
          starred_url: 'https://api.github.com/users/costajohnt/starred{/owner}{/repo}',
          subscriptions_url: 'https://api.github.com/users/costajohnt/subscriptions',
          type: 'User',
          url: 'https://api.github.com/users/costajohnt',
        },
      },
      body: null,
      changed_files: 1,
      closed_at: null,
      comments: 0,
      comments_url:
        'https://api.github.com/repos/costajohnt/github-slack-tooling/issues/1/comments',
      commits: 1,
      commits_url: 'https://api.github.com/repos/costajohnt/github-slack-tooling/pulls/1/commits',
      created_at: '2022-10-04T00:33:16Z',
      deletions: 0,
      diff_url: 'https://github.com/costajohnt/github-slack-tooling/pull/1.diff',
      draft: false,
      head: {
        label: 'costajohnt:testing-workflow',
        ref: 'testing-workflow',
        repo: {
          allow_auto_merge: false,
          allow_forking: true,
          allow_merge_commit: true,
          allow_rebase_merge: true,
          allow_squash_merge: true,
          allow_update_branch: false,
          archive_url:
            'https://api.github.com/repos/costajohnt/github-slack-tooling/{archive_format}{/ref}',
          archived: false,
          assignees_url:
            'https://api.github.com/repos/costajohnt/github-slack-tooling/assignees{/user}',
          blobs_url: 'https://api.github.com/repos/costajohnt/github-slack-tooling/git/blobs{/sha}',
          branches_url:
            'https://api.github.com/repos/costajohnt/github-slack-tooling/branches{/branch}',
          clone_url: 'https://github.com/costajohnt/github-slack-tooling.git',
          collaborators_url:
            'https://api.github.com/repos/costajohnt/github-slack-tooling/collaborators{/collaborator}',
          comments_url:
            'https://api.github.com/repos/costajohnt/github-slack-tooling/comments{/number}',
          commits_url: 'https://api.github.com/repos/costajohnt/github-slack-tooling/commits{/sha}',
          compare_url:
            'https://api.github.com/repos/costajohnt/github-slack-tooling/compare/{base}...{head}',
          contents_url:
            'https://api.github.com/repos/costajohnt/github-slack-tooling/contents/{+path}',
          contributors_url:
            'https://api.github.com/repos/costajohnt/github-slack-tooling/contributors',
          created_at: '2022-10-04T00:13:47Z',
          default_branch: 'main',
          delete_branch_on_merge: false,
          deployments_url:
            'https://api.github.com/repos/costajohnt/github-slack-tooling/deployments',
          description: 'Github action that notifies developer when their code has been reviewed',
          disabled: false,
          downloads_url: 'https://api.github.com/repos/costajohnt/github-slack-tooling/downloads',
          events_url: 'https://api.github.com/repos/costajohnt/github-slack-tooling/events',
          fork: false,
          forks: 0,
          forks_count: 0,
          forks_url: 'https://api.github.com/repos/costajohnt/github-slack-tooling/forks',
          full_name: 'costajohnt/github-slack-tooling',
          git_commits_url:
            'https://api.github.com/repos/costajohnt/github-slack-tooling/git/commits{/sha}',
          git_refs_url:
            'https://api.github.com/repos/costajohnt/github-slack-tooling/git/refs{/sha}',
          git_tags_url:
            'https://api.github.com/repos/costajohnt/github-slack-tooling/git/tags{/sha}',
          git_url: 'git://github.com/costajohnt/github-slack-tooling.git',
          has_downloads: true,
          has_issues: true,
          has_pages: false,
          has_projects: true,
          has_wiki: true,
          homepage: null,
          hooks_url: 'https://api.github.com/repos/costajohnt/github-slack-tooling/hooks',
          html_url: 'https://github.com/costajohnt/github-slack-tooling',
          id: 545194132,
          is_template: false,
          issue_comment_url:
            'https://api.github.com/repos/costajohnt/github-slack-tooling/issues/comments{/number}',
          issue_events_url:
            'https://api.github.com/repos/costajohnt/github-slack-tooling/issues/events{/number}',
          issues_url:
            'https://api.github.com/repos/costajohnt/github-slack-tooling/issues{/number}',
          keys_url: 'https://api.github.com/repos/costajohnt/github-slack-tooling/keys{/key_id}',
          labels_url: 'https://api.github.com/repos/costajohnt/github-slack-tooling/labels{/name}',
          language: null,
          languages_url: 'https://api.github.com/repos/costajohnt/github-slack-tooling/languages',
          license: null,
          merge_commit_message: 'PR_TITLE',
          merge_commit_title: 'MERGE_MESSAGE',
          merges_url: 'https://api.github.com/repos/costajohnt/github-slack-tooling/merges',
          milestones_url:
            'https://api.github.com/repos/costajohnt/github-slack-tooling/milestones{/number}',
          mirror_url: null,
          name: 'github-slack-tooling',
          node_id: 'R_kgDOIH8AlA',
          notifications_url:
            'https://api.github.com/repos/costajohnt/github-slack-tooling/notifications{?since,all,participating}',
          open_issues: 1,
          open_issues_count: 1,
          owner: {
            avatar_url: 'https://avatars.githubusercontent.com/u/14304404?v=4',
            events_url: 'https://api.github.com/users/costajohnt/events{/privacy}',
            followers_url: 'https://api.github.com/users/costajohnt/followers',
            following_url: 'https://api.github.com/users/costajohnt/following{/other_user}',
            gists_url: 'https://api.github.com/users/costajohnt/gists{/gist_id}',
            gravatar_id: '',
            html_url: 'https://github.com/costajohnt',
            id: 14304404,
            login: 'costajohnt',
            node_id: 'MDQ6VXNlcjE0MzA0NDA0',
            organizations_url: 'https://api.github.com/users/costajohnt/orgs',
            received_events_url: 'https://api.github.com/users/costajohnt/received_events',
            repos_url: 'https://api.github.com/users/costajohnt/repos',
            site_admin: false,
            starred_url: 'https://api.github.com/users/costajohnt/starred{/owner}{/repo}',
            subscriptions_url: 'https://api.github.com/users/costajohnt/subscriptions',
            type: 'User',
            url: 'https://api.github.com/users/costajohnt',
          },
          private: false,
          pulls_url: 'https://api.github.com/repos/costajohnt/github-slack-tooling/pulls{/number}',
          pushed_at: '2022-10-04T00:33:17Z',
          releases_url:
            'https://api.github.com/repos/costajohnt/github-slack-tooling/releases{/id}',
          size: 0,
          squash_merge_commit_message: 'COMMIT_MESSAGES',
          squash_merge_commit_title: 'COMMIT_OR_PR_TITLE',
          ssh_url: 'git@github.com:costajohnt/github-slack-tooling.git',
          stargazers_count: 0,
          stargazers_url: 'https://api.github.com/repos/costajohnt/github-slack-tooling/stargazers',
          statuses_url:
            'https://api.github.com/repos/costajohnt/github-slack-tooling/statuses/{sha}',
          subscribers_url:
            'https://api.github.com/repos/costajohnt/github-slack-tooling/subscribers',
          subscription_url:
            'https://api.github.com/repos/costajohnt/github-slack-tooling/subscription',
          svn_url: 'https://github.com/costajohnt/github-slack-tooling',
          tags_url: 'https://api.github.com/repos/costajohnt/github-slack-tooling/tags',
          teams_url: 'https://api.github.com/repos/costajohnt/github-slack-tooling/teams',
          topics: [],
          trees_url: 'https://api.github.com/repos/costajohnt/github-slack-tooling/git/trees{/sha}',
          updated_at: '2022-10-04T00:13:47Z',
          url: 'https://api.github.com/repos/costajohnt/github-slack-tooling',
          use_squash_pr_title_as_default: false,
          visibility: 'public',
          watchers: 0,
          watchers_count: 0,
          web_commit_signoff_required: false,
        },
        sha: '46590f9c42510c73c7ae48fd714a384c192eb48f',
        user: {
          avatar_url: 'https://avatars.githubusercontent.com/u/14304404?v=4',
          events_url: 'https://api.github.com/users/costajohnt/events{/privacy}',
          followers_url: 'https://api.github.com/users/costajohnt/followers',
          following_url: 'https://api.github.com/users/costajohnt/following{/other_user}',
          gists_url: 'https://api.github.com/users/costajohnt/gists{/gist_id}',
          gravatar_id: '',
          html_url: 'https://github.com/costajohnt',
          id: 14304404,
          login: 'costajohnt',
          node_id: 'MDQ6VXNlcjE0MzA0NDA0',
          organizations_url: 'https://api.github.com/users/costajohnt/orgs',
          received_events_url: 'https://api.github.com/users/costajohnt/received_events',
          repos_url: 'https://api.github.com/users/costajohnt/repos',
          site_admin: false,
          starred_url: 'https://api.github.com/users/costajohnt/starred{/owner}{/repo}',
          subscriptions_url: 'https://api.github.com/users/costajohnt/subscriptions',
          type: 'User',
          url: 'https://api.github.com/users/costajohnt',
        },
      },
      html_url: 'https://github.com/costajohnt/github-slack-tooling/pull/1',
      id: 1075357486,
      issue_url: 'https://api.github.com/repos/costajohnt/github-slack-tooling/issues/1',
      labels: [],
      locked: false,
      maintainer_can_modify: false,
      merge_commit_sha: 'cbc0a6d050681cd84ae3e5f4046cd1a9b9da1bd8',
      mergeable: true,
      mergeable_state: 'clean',
      merged: false,
      merged_at: null,
      merged_by: null,
      milestone: null,
      node_id: 'PR_kwDOIH8AlM5AGKcu',
      number: 1,
      patch_url: 'https://github.com/costajohnt/github-slack-tooling/pull/1.patch',
      rebaseable: true,
      requested_reviewers: [],
      requested_teams: [],
      review_comment_url:
        'https://api.github.com/repos/costajohnt/github-slack-tooling/pulls/comments{/number}',
      review_comments: 0,
      review_comments_url:
        'https://api.github.com/repos/costajohnt/github-slack-tooling/pulls/1/comments',
      state: 'open',
      statuses_url:
        'https://api.github.com/repos/costajohnt/github-slack-tooling/statuses/46590f9c42510c73c7ae48fd714a384c192eb48f',
      title: 'update readme',
      updated_at: '2022-10-04T00:33:26Z',
      url: 'https://api.github.com/repos/costajohnt/github-slack-tooling/pulls/1',
      user: {
        avatar_url: 'https://avatars.githubusercontent.com/u/14304404?v=4',
        events_url: 'https://api.github.com/users/costajohnt/events{/privacy}',
        followers_url: 'https://api.github.com/users/costajohnt/followers',
        following_url: 'https://api.github.com/users/costajohnt/following{/other_user}',
        gists_url: 'https://api.github.com/users/costajohnt/gists{/gist_id}',
        gravatar_id: '',
        html_url: 'https://github.com/costajohnt',
        id: 14304404,
        login: 'costajohnt',
        node_id: 'MDQ6VXNlcjE0MzA0NDA0',
        organizations_url: 'https://api.github.com/users/costajohnt/orgs',
        received_events_url: 'https://api.github.com/users/costajohnt/received_events',
        repos_url: 'https://api.github.com/users/costajohnt/repos',
        site_admin: false,
        starred_url: 'https://api.github.com/users/costajohnt/starred{/owner}{/repo}',
        subscriptions_url: 'https://api.github.com/users/costajohnt/subscriptions',
        type: 'User',
        url: 'https://api.github.com/users/costajohnt',
      },
    },
    repository: {
      allow_forking: true,
      archive_url:
        'https://api.github.com/repos/costajohnt/github-slack-tooling/{archive_format}{/ref}',
      archived: false,
      assignees_url:
        'https://api.github.com/repos/costajohnt/github-slack-tooling/assignees{/user}',
      blobs_url: 'https://api.github.com/repos/costajohnt/github-slack-tooling/git/blobs{/sha}',
      branches_url:
        'https://api.github.com/repos/costajohnt/github-slack-tooling/branches{/branch}',
      clone_url: 'https://github.com/costajohnt/github-slack-tooling.git',
      collaborators_url:
        'https://api.github.com/repos/costajohnt/github-slack-tooling/collaborators{/collaborator}',
      comments_url:
        'https://api.github.com/repos/costajohnt/github-slack-tooling/comments{/number}',
      commits_url: 'https://api.github.com/repos/costajohnt/github-slack-tooling/commits{/sha}',
      compare_url:
        'https://api.github.com/repos/costajohnt/github-slack-tooling/compare/{base}...{head}',
      contents_url: 'https://api.github.com/repos/costajohnt/github-slack-tooling/contents/{+path}',
      contributors_url: 'https://api.github.com/repos/costajohnt/github-slack-tooling/contributors',
      created_at: '2022-10-04T00:13:47Z',
      default_branch: 'main',
      deployments_url: 'https://api.github.com/repos/costajohnt/github-slack-tooling/deployments',
      description: 'Github action that notifies developer when their code has been reviewed',
      disabled: false,
      downloads_url: 'https://api.github.com/repos/costajohnt/github-slack-tooling/downloads',
      events_url: 'https://api.github.com/repos/costajohnt/github-slack-tooling/events',
      fork: false,
      forks: 0,
      forks_count: 0,
      forks_url: 'https://api.github.com/repos/costajohnt/github-slack-tooling/forks',
      full_name: 'costajohnt/github-slack-tooling',
      git_commits_url:
        'https://api.github.com/repos/costajohnt/github-slack-tooling/git/commits{/sha}',
      git_refs_url: 'https://api.github.com/repos/costajohnt/github-slack-tooling/git/refs{/sha}',
      git_tags_url: 'https://api.github.com/repos/costajohnt/github-slack-tooling/git/tags{/sha}',
      git_url: 'git://github.com/costajohnt/github-slack-tooling.git',
      has_downloads: true,
      has_issues: true,
      has_pages: false,
      has_projects: true,
      has_wiki: true,
      homepage: null,
      hooks_url: 'https://api.github.com/repos/costajohnt/github-slack-tooling/hooks',
      html_url: 'https://github.com/costajohnt/github-slack-tooling',
      id: 545194132,
      is_template: false,
      issue_comment_url:
        'https://api.github.com/repos/costajohnt/github-slack-tooling/issues/comments{/number}',
      issue_events_url:
        'https://api.github.com/repos/costajohnt/github-slack-tooling/issues/events{/number}',
      issues_url: 'https://api.github.com/repos/costajohnt/github-slack-tooling/issues{/number}',
      keys_url: 'https://api.github.com/repos/costajohnt/github-slack-tooling/keys{/key_id}',
      labels_url: 'https://api.github.com/repos/costajohnt/github-slack-tooling/labels{/name}',
      language: null,
      languages_url: 'https://api.github.com/repos/costajohnt/github-slack-tooling/languages',
      license: null,
      merges_url: 'https://api.github.com/repos/costajohnt/github-slack-tooling/merges',
      milestones_url:
        'https://api.github.com/repos/costajohnt/github-slack-tooling/milestones{/number}',
      mirror_url: null,
      name: 'github-slack-tooling',
      node_id: 'R_kgDOIH8AlA',
      notifications_url:
        'https://api.github.com/repos/costajohnt/github-slack-tooling/notifications{?since,all,participating}',
      open_issues: 1,
      open_issues_count: 1,
      owner: {
        avatar_url: 'https://avatars.githubusercontent.com/u/14304404?v=4',
        events_url: 'https://api.github.com/users/costajohnt/events{/privacy}',
        followers_url: 'https://api.github.com/users/costajohnt/followers',
        following_url: 'https://api.github.com/users/costajohnt/following{/other_user}',
        gists_url: 'https://api.github.com/users/costajohnt/gists{/gist_id}',
        gravatar_id: '',
        html_url: 'https://github.com/costajohnt',
        id: 14304404,
        login: 'costajohnt',
        node_id: 'MDQ6VXNlcjE0MzA0NDA0',
        organizations_url: 'https://api.github.com/users/costajohnt/orgs',
        received_events_url: 'https://api.github.com/users/costajohnt/received_events',
        repos_url: 'https://api.github.com/users/costajohnt/repos',
        site_admin: false,
        starred_url: 'https://api.github.com/users/costajohnt/starred{/owner}{/repo}',
        subscriptions_url: 'https://api.github.com/users/costajohnt/subscriptions',
        type: 'User',
        url: 'https://api.github.com/users/costajohnt',
      },
      private: false,
      pulls_url: 'https://api.github.com/repos/costajohnt/github-slack-tooling/pulls{/number}',
      pushed_at: '2022-10-04T00:33:17Z',
      releases_url: 'https://api.github.com/repos/costajohnt/github-slack-tooling/releases{/id}',
      size: 0,
      ssh_url: 'git@github.com:costajohnt/github-slack-tooling.git',
      stargazers_count: 0,
      stargazers_url: 'https://api.github.com/repos/costajohnt/github-slack-tooling/stargazers',
      statuses_url: 'https://api.github.com/repos/costajohnt/github-slack-tooling/statuses/{sha}',
      subscribers_url: 'https://api.github.com/repos/costajohnt/github-slack-tooling/subscribers',
      subscription_url: 'https://api.github.com/repos/costajohnt/github-slack-tooling/subscription',
      svn_url: 'https://github.com/costajohnt/github-slack-tooling',
      tags_url: 'https://api.github.com/repos/costajohnt/github-slack-tooling/tags',
      teams_url: 'https://api.github.com/repos/costajohnt/github-slack-tooling/teams',
      topics: [],
      trees_url: 'https://api.github.com/repos/costajohnt/github-slack-tooling/git/trees{/sha}',
      updated_at: '2022-10-04T00:13:47Z',
      url: 'https://api.github.com/repos/costajohnt/github-slack-tooling',
      visibility: 'public',
      watchers: 0,
      watchers_count: 0,
      web_commit_signoff_required: false,
    },
    sender: {
      avatar_url: 'https://avatars.githubusercontent.com/u/14304404?v=4',
      events_url: 'https://api.github.com/users/costajohnt/events{/privacy}',
      followers_url: 'https://api.github.com/users/costajohnt/followers',
      following_url: 'https://api.github.com/users/costajohnt/following{/other_user}',
      gists_url: 'https://api.github.com/users/costajohnt/gists{/gist_id}',
      gravatar_id: '',
      html_url: 'https://github.com/costajohnt',
      id: 14304404,
      login: 'costajohnt',
      node_id: 'MDQ6VXNlcjE0MzA0NDA0',
      organizations_url: 'https://api.github.com/users/costajohnt/orgs',
      received_events_url: 'https://api.github.com/users/costajohnt/received_events',
      repos_url: 'https://api.github.com/users/costajohnt/repos',
      site_admin: false,
      starred_url: 'https://api.github.com/users/costajohnt/starred{/owner}{/repo}',
      subscriptions_url: 'https://api.github.com/users/costajohnt/subscriptions',
      type: 'User',
      url: 'https://api.github.com/users/costajohnt',
    },
  },
  server_url: 'https://github.com',
  api_url: 'https://api.github.com',
  graphql_url: 'https://api.github.com/graphql',
  ref_name: '1/merge',
  ref_protected: false,
  ref_type: 'branch',
  secret_source: 'Actions',
  workspace: '/home/runner/work/github-slack-tooling/github-slack-tooling',
  action: '__run',
};

function toPromise<E, T>(task: Task<E, T>) {
  return new Promise<T>((resolve, reject) => task.fork(reject, resolve));
}

export const slackZenQuote = async (event: unknown) =>
  toPromise(decodeEvent(event).andThen(messageIfApplicable));

slackZenQuote(sampleEvent).catch((e) => {
  console.log(e);
});
