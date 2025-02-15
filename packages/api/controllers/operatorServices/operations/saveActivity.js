const activityStream = require("../../../models/activityStream");

module.exports = async function saveActivity(request) {
  const activity = new activityStream({
    source: request.source,
    action: request.action,
    propertyName: request.propertyName,
    props: { env: request.props.env, spaName: request.props.spaName },
    payload: request?.payload
  });
  const response = await activity.save();
  return response;
}