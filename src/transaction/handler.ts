import * as sevice from './service';
import { verifyToken } from '../shared/auth';

export const lambdaHandler = async (event:any) => {
    try {
        const user = verifyToken(event); 

        const httpMethod = event.requestContext.http.method;
        const path = event.rawPath
        const data = event.body ? JSON.parse(event.body) : {};
        
        if (httpMethod === 'POST' && path === '/outcome'){
            await sevice.newOutcome(data, user);
            return {
                statusCode: 200,
                body: JSON.stringify({
                    message: "Transaction created",
                })
            }
        }

        if (httpMethod === 'PUT' && path === '/outcome'){
            await sevice.editOutcome(data, user);
            return{
                statusCode : 200,
                body: JSON.stringify({
                    message: "Transaction updated",
                })
            }
        }

        if (httpMethod === 'DELETE' && path === '/outcome'){
            await sevice.deleteOutcome(data, user);
            return{
                statusCode : 200,
                body: JSON.stringify({
                    message: "Transaction deleted",
                })
            }
        }

        if (httpMethod === 'POST' && path === '/debt'){
            await sevice.newDebt(data, user);
            return{
                statusCode: 200,
                body: JSON.stringify({
                    message: "Debt created",
                })
            }
        }

        if (httpMethod === 'PUT' && path === '/debt'){
            await sevice.editDebt(data, user);
            return{
                statusCode: 200,
                body: JSON.stringify({
                    message: "Debt updated",
                })
            }
        }

        if (httpMethod === 'DELETE' && path === '/debt'){
            await sevice.deleteDebt(data, user);
            return{
                statusCode: 200,
                body: JSON.stringify({
                    message: "Debt deleted",
                })
            }
        }

        if (httpMethod === 'POST' && path === '/category'){
            await sevice.newCategory(data, user);
            return{
                statusCode: 200,
                body: JSON.stringify({
                    message: "Category created",
                })
            }
        }

        if (httpMethod === 'PUT' && path === '/category'){
            await sevice.editCategory(data, user);
            return{
                statusCode: 200,
                body: JSON.stringify({
                    message: "Category updated",
                })
            }
        }

        if (httpMethod === 'DELETE' && path === '/category'){
            await sevice.deleteCategory(data, user);
            return{
                statusCode: 200,
                body: JSON.stringify({
                    message: "Category deleted",
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