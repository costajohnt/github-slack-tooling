import { MissingVarError } from '@execonline-inc/environment';
import { HttpError } from 'ajaxios';
import Decoder, { succeed, at, string, field } from 'jsonous';
import { stringLiteral } from '@execonline-inc/decoders';

export const quoteDecoder: Decoder<ZenQuote> = succeed({})
  .assign('quote', at([0, 'q'], string))
  .assign('author', at([0, 'a'], string));

type SlackNotifierError = HttpError | SlackNotifierRequestFailed;

export type HandlerFail = MissingVarError | SlackNotifierError | EventDecodeFailed;

export type SuccessLambdaResult = SlackNotificationSuccess;

export interface SlackNotifierRequestFailed {
  kind: 'slack-notifier-request-failed';
  message: string;
}

export const slackNotifierRequestFailed = (err: HttpError): SlackNotifierRequestFailed => ({
  kind: 'slack-notifier-request-failed',
  message: err.kind,
});

export interface EventDecodeFailed {
  kind: 'event-decode-failed';
  message: string;
}

export const eventDecodeFailed = (err: string): EventDecodeFailed => ({
  kind: 'event-decode-failed',
  message: err,
});

export interface SlackNotificationSuccess {
  kind: 'slack-notifier-request-succeeded';
  message: unknown;
}

export const slackNotifierRequestSucceded = (s: unknown): SlackNotificationSuccess => ({
  kind: 'slack-notifier-request-succeeded',
  message: s,
});

export interface MessageDecoderFailed {
  kind: 'message-decoder-failed';
  message: string;
}

export interface SlackMessage {
  slackChannel: string;
  slackUser: string;
  slackWebhookUrl: string;
  zenQuote: ZenQuote;
  github: Github;
}

export interface ZenQuote {
  quote: string;
  author: string;
}

const labelDecoder: Decoder<Label> = succeed({}).assign('name', field('name', string));

const linkDecoder: Decoder<Link> = succeed({}).assign('href', field('href', string));
const linksDecoder: Decoder<Links> = succeed({}).assign('self', field('self', linkDecoder));

const eventGDecoder: Decoder<EventG> = succeed({})
  .assign('action', field('action', stringLiteral('unlabeled')))
  .assign('label', field('label', labelDecoder))
  .assign('pullRequest', field('pull_request', linksDecoder));

const userDecoder: Decoder<User> = succeed({}).assign('login', field('login', string));
const pullRequestDecoder: Decoder<PullRequest> = succeed({}).assign(
  'user',
  field('user', userDecoder)
);

export const githubDecoder: Decoder<Github> = succeed({})
  .assign('eventG', field('event', eventGDecoder))
  .assign('pullRequest', field('pull_request', pullRequestDecoder));

export interface Github {
  eventG: EventG;
  pullRequest: PullRequest;
}

interface PullRequest {
  user: User;
}

interface User {
  login: string;
}

interface EventG {
  action: 'unlabeled';
  label: Label;
  pullRequest: Links;
}

interface Links {
  self: Link;
}

// maybe can use a URL type or something here
interface Link {
  href: string;
}

interface Label {
  name: string;
}
