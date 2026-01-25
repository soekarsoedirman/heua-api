import * as sevice from './service';
import { verifyToken } from '../shared/auth';

export const lambdaHandler = async (event:any) => {
    try {
        const user = verifyToken(event); 

        const httpMethod = event.requestContext.http.method;
        const path = event.rawPath
        const data = event.body ? JSON.parse(event.body) : {};

        if (httpMethod === 'POST' && path === '/income'){
            await sevice.newIncome(data, user);
            return{
                statusCode: 200,
                body: JSON.stringify({
                    message: "income tercatat",
                })
            }
        }

        if (httpMethod === 'PUT' && path === '/income'){
            await sevice.editIncome(data, user);
            return{
                statusCode: 200,
                body: JSON.stringify({
                    message: "Income diupdate",
                })
            }
        }

        if (httpMethod === 'DELETE' && path === '/income'){
            await sevice.deleteIncome(data, user);
            return{
                statusCode: 200,
                body: JSON.stringify({
                    message: "Income dihapus",
                })
            }
        }
        
        if (httpMethod === 'POST' && path === '/outcome'){
            await sevice.newOutcome(data, user);
            return {
                statusCode: 200,
                body: JSON.stringify({
                    message: "Outcome tercatat",
                })
            }
        }

        if (httpMethod === 'PUT' && path === '/outcome'){
            await sevice.editOutcome(data, user);
            return{
                statusCode : 200,
                body: JSON.stringify({
                    message: "Outcome diupdate",
                })
            }
        }

        if (httpMethod === 'DELETE' && path === '/outcome'){
            await sevice.deleteOutcome(data, user);
            return{
                statusCode : 200,
                body: JSON.stringify({
                    message: "Outcome terhapus",
                })
            }
        }

        if (httpMethod === 'POST' && path === '/debt'){
            await sevice.newDebt(data, user);
            return{
                statusCode: 200,
                body: JSON.stringify({
                    message: "Hutang tercatat",
                })
            }
        }

        if (httpMethod === 'PUT' && path === '/debt'){
            await sevice.editDebt(data, user);
            return{
                statusCode: 200,
                body: JSON.stringify({
                    message: "Hutang diupdate",
                })
            }
        }

        if (httpMethod === 'DELETE' && path === '/debt'){
            await sevice.deleteDebt(data, user);
            return{
                statusCode: 200,
                body: JSON.stringify({
                    message: "Hutang terhapus",
                })
            }
        }

        if (httpMethod === 'POST' && path === '/payDebt'){
            await sevice.payDebt(data, user);
            return{
                statusCode: 200,
                body: JSON.stringify({
                    message: "Hutang terbayar",
                })
            }
        }

        if (httpMethod === 'POST' && path === '/category'){
            await sevice.newCategory(data, user);
            return{
                statusCode: 200,
                body: JSON.stringify({
                    message: "Kategori dibuat",
                })
            }
        }

        if (httpMethod === 'PUT' && path === '/category'){
            await sevice.editCategory(data, user);
            return{
                statusCode: 200,
                body: JSON.stringify({
                    message: "Kategori Diedit",
                })
            }
        }

        if (httpMethod === 'DELETE' && path === '/category'){
            await sevice.deleteCategory(data, user);
            return{
                statusCode: 200,
                body: JSON.stringify({
                    message: "Kategori terhapus",
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