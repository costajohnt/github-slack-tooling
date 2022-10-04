import { readVarT } from '@execonline-inc/environment';
import { get, HttpError, post, toHttpTask } from 'ajaxios';
import Task from 'taskarian';
import {
  GithubEvent,
  HandlerFail,
  quoteDecoder,
  SlackMessage,
  SlackNotificationSuccess,
  SlackNotifierRequestFailed,
  slackNotifierRequestFailed,
  slackNotifierRequestSucceded,
  SuccessLambdaResult,
  ZenQuote,
} from './Types';

const href: string = 'https://zenquotes.io/api/random';

const getZenQuote = (): Task<HttpError, ZenQuote> =>
  toHttpTask(get(href).withDecoder(quoteDecoder));

const buildRequestT = (slackMessage: SlackMessage): Task<HttpError, unknown> =>
  toHttpTask(
    post(slackMessage.slackWebhookUrl).withData({
      text: slackMessage.zenQuote.quote,
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

export const slackZenQuote = (event: GithubEvent): Task<HandlerFail, SuccessLambdaResult> =>
  Task.succeed<HandlerFail, {}>({})
    .assign(
      'event',
      decodeEventObject(event).mapError<HandlerFail>((e) => e)
    )
    .assign('zenQuote', getZenQuote())
    .assign('slackChannel', readVarT('SLACK_CHANNEL'))
    .assign('slackUser', readVarT('SLACK_USER'))
    .assign('slackWebhookUrl', readVarT('SLACK_WEBHOOK_URL'))
    .andThen(postQuoteToSlack);
