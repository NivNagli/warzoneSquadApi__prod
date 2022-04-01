exports.errorDescriptionBuilder = (errorCode, description, possibleCause) => {
    const errorDescription = {};
    errorDescription["message"] = description;
    errorDescription["name"] = "Error";
    errorDescription["possibleCause"] = possibleCause;
    errorDescription["originalMessage"] = `Request failed with status code ${errorCode}`;
    return errorDescription;
};

exports.fixBattleName = (name) => {
    return name.split("%23")[0] + "%2523" + name.split("%23")[1];
}