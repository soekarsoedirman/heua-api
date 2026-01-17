import { 
    APIGatewayProxyEvent, 
    APIGatewayProxyResult,
    Context 
} from 'aws-lambda';
import * as appService from './transaction/service';
import * as authService from './auth/authService';

/**
 * Handler utama untuk AWS Lambda.
 * Fungsi ini dikonfigurasi untuk menerima event dari API Gateway.
 * * @param event - Objek yang berisi data permintaan (request)
 * @param context - Informasi runtime mengenai eksekusi Lambda
 * @returns Promise dengan format response API Gateway
 */

export const lambdaHandler = async (
    event: APIGatewayProxyEvent,
    context: Context
): Promise<APIGatewayProxyResult> => {

    console.log('Event received:', JSON.stringify(event, null, 2));
    console.log('Remaining time (ms):', context.getRemainingTimeInMillis());

    const { httpMethod, resource, body, pathParameters } = event;
    const id = pathParameters?.id;


    try {
        if (httpMethod === 'POST' && resource === '/login'){
            const { email, password } = JSON.parse(body || '{}' );
            const token = await authService.login(email, password);
        }
        if (httpMethod === 'POST' && resource === '/register'){

        }
        
        //token verivikasi
        
        //token verifikasi

        if (httpMethod === 'GET' && resource === '/dashboard'){
            const dashboardData = await appService.getDashboardData();
            return {
                statusCode: 200,
                headers: {
                    "Access-Control-Allow-Origin": "*",
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    message: 'Berhasil mendapatkan data dashboard',
                    data: dashboardData
                }),
            }
        }

        if (httpMethod === 'GET' && resource === '/statistik'){
            const statistikData = await appService.getStatistikData();
            return {
                statusCode: 200,
                headers: {
                    "Access-Control-Allow-Origin": "*",
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    message: 'Berhasil mendapatkan data statistik',
                    data: statistikData
                }),
            }
        }

        if (httpMethod === 'GET' && resource === '/riwayat'){
            const riwayatData = await appService.getRiwayatData();
            return {
                statusCode: 200,
                headers: {
                    "Access-Control-Allow-Origin": "*",
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    message: 'Berhasil mendapatkan data riwayat',
                    data: riwayatData
                }),
            }
        }

        if (httpMethod === 'GET' && resource === '/riwayat' && id){
            const riwayatDetailData = await appService.getRiwayatDetailData(id);
            return {
                statusCode: 200,
                headers: {
                    "Access-Control-Allow-Origin": "*",
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    message: 'Berhasil mendapatkan data riwayat detail',
                    data: riwayatDetailData
                }),
            }
        }

        if (httpMethod === 'POST' && resource === '/riwayat'){
            
        }

        if (httpMethod === 'PUT' && resource === '/riwayat' && id){

        }

        if (httpMethod === 'DELETE' && resource === '/riwayat' && id){

        }

        if (httpMethod === 'GET' && resource === '/kategori') {
            const kategoriData = await appService.getKategoriData();
            return {
                statusCode: 200,
                headers: {
                    "Access-Control-Allow-Origin": "*",
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    message: 'Berhasil mendapatkan data kategori',
                    data: kategoriData
                }),
            }
        }

        if (httpMethod === 'POST' && resource === '/kategori') {

        }

        if (httpMethod === 'PUT' && resource === '/kategori' && id) {

        }

        if (httpMethod === 'DELETE' && resource === '/kategori' && id) {

        }

    } catch (err) {
        console.log(err);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'some error happened',
            }),
        };
    }

    return {
        statusCode: 404,
        body: JSON.stringify({
            message: 'Endpoint not found',
        }),
    };
};
