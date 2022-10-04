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

// return unless github.event.action == "unlabeled"
// return unless github.event.label.name == "Needs Review"
// author = github.event.pull_request.user.login
// authors = { costajohnt: 'costajohnt' }
// slack_name = authors.fetch(author.to_sym)
// link_to_pr = github.event.pull_request._links.self
// *send direct message to slack notifying user that needs review label has been removed with PR name and link
// (make another action that notifies user when PR is approved)

const decodeEvent = (event: Github): Task<HandlerFail, Github> =>
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

export const slackZenQuote = (event: Github): Task<HandlerFail, SuccessLambdaResult> =>
  decodeEvent(event).andThen(messageIfApplicable);
