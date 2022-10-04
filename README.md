# github-slack-tooling
Github action that notifies developer when their code has been reviewed

# Event

Code reviewer removes label from pull request.

# Function

- Parses pull request title, link, and author
- Fetches inspirational quote
- Maps Github username to Slack username
- Sends direct Slack message to pull request author, notifying them that their code has been reviewed.