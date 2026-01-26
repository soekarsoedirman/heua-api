import * as sevice from './service';
import { verifyToken } from '../shared/auth';

export const lambdaHandler = async (event:any) => {
    try {
        const user = verifyToken(event); 
        const userEmail = (user as any).email;

        const httpMethod = event.requestContext.http.method;
        const path = event.rawPath
        const data = event.body ? JSON.parse(event.body) : {};
        
        if (httpMethod === 'GET' && path === '/dashboard'){
            const dashboard = await sevice.dashboard(data, user);
            return{
                statusCode: 200,
                body: JSON.stringify({
                    message: "Dashboard",
                    data: dashboard
                })
            }
        }

        if (httpMethod === 'GET' && path === '/statistic'){
            const statistic = await sevice.statistic(data, user);
            return{
                statusCode: 200,
                body: JSON.stringify({
                    message: "Statistic",
                    data: statistic
                })
            }
        }

        if (httpMethod === 'GET' && path === '/riwayat'){
            const riwayat = await sevice.riwayat(data, user);
            return{
                statusCode: 200,
                body: JSON.stringify({
                    message: "Riwayat",
                    data: riwayat
                })
            }
        }

        if (httpMethod === 'GET' && path === '/kategori'){
            const kategori = await sevice.kategori(data, user);
            return{
                statusCode: 200,
                body: JSON.stringify({
                    message: "Kategori",
                    data: kategori
                })
            }
        }

        
    } catch (error:any) {
        console.error("Error Log: ", error);
        return {
            statusCode: error.status || 500,
            body: JSON.stringify({ 
                message: error.message || "Internal server error" 
            })
        };
    }
}