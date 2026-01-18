import * as service from './authService';

export const lambdaHandler = async (event: any) => {
    try {

        const httpMethod = event.requestContext.http.method;
        const path = event.rawPath
        const data = event.body ? JSON.parse(event.body) : {};
        
        if (httpMethod === 'POST' && path === '/login'){
            const profile = await service.login(data);
            return {
                statusCode: 200,
                body: JSON.stringify({
                    message: "Login berhasil",
                    token: profile
                })
            }
        }

        if (httpMethod === 'POST' && path === '/register'){
            const profile = await service.register(data);
            return {
                statusCode: 200,
                body: JSON.stringify({
                    message: "Register berhasil",
                    token: profile
                })
            }
        }

    } catch (error: any) {
    console.error("Error Log: ", error);
    return {
        statusCode: error.status || 500,
        body: JSON.stringify({ 
            message: error.message || "Internal server error" 
        })
    };
}
}