class APIErrorMessages:
    def __init__(self):
        self.errors = {
            400: "Bad Request: The server could not understand the request due to invalid syntax.",
            401: "Unauthorized: The client must authenticate itself to get the requested response.",
            403: "Forbidden: The client does not have access rights to the content.",
            404: "Not Found: The server can not find the requested resource.",
            405: "Method Not Allowed: The method specified in the request is not allowed.",
            408: "Request Timeout: The server would like to shut down this unused connection.",
            409: "Conflict: The request could not be completed due to a conflict with the current state of the target resource.",
            410: "Gone: The requested content has been permanently deleted from the server.",
            429: "Too Many Requests: The user has sent too many requests in a given amount of time.",
            500: "Internal Server Error: The server has encountered a situation it doesn't know how to handle.",
            501: "Not Implemented: The request method is not supported by the server.",
            502: "Bad Gateway: The server was acting as a gateway or proxy and received an invalid response from the upstream server.",
            503: "Service Unavailable: The server is not ready to handle the request, it may be misconfigured or external service not available",
            504: "Gateway Timeout: The server is acting as a gateway and cannot get a response in time."
        }

        self.valid_responses = {
            200: "OK: The request has succeeded.",
            201: "Created: The request has succeeded and a new resource has been created as a result.",
            202: "Accepted: The request has been received but not yet acted upon.",
            204: "No Content: There is no content to send for this request, but the headers may be useful.",
            206: "Partial Content: The server is delivering only part of the resource due to a range header sent by the client."
        }

    def get_error_message(self, error_code):
        """
        Get the error message for a given error code.

        :param error_code: HTTP error code
        :return: Corresponding error message
        """
        return self.errors.get(error_code, "Unknown Error: An unexpected error has occurred.")

    def get_valid_response_message(self, response_code):
        """
        Get the valid response message for a given response code.

        :param response_code: HTTP response code
        :return: Corresponding response message
        """
        return self.valid_responses.get(response_code, "Unknown Response: The response code is not recognized.") 