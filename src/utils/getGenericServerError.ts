const getGenericServerError = (error: Error) => {
    console.error(error);
    return {
        message: "An error has occured, please try again later"
    };
}

export default getGenericServerError;
