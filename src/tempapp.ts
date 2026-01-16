import { 
  APIGatewayProxyEvent, 
  APIGatewayProxyResult, 
  Context 
} from 'aws-lambda';

/**
 * Handler utama untuk AWS Lambda.
 * Fungsi ini dikonfigurasi untuk menerima event dari API Gateway.
 * * @param event - Objek yang berisi data permintaan (request)
 * @param context - Informasi runtime mengenai eksekusi Lambda
 * @returns Promise dengan format response API Gateway
 */
export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  
  // Log informasi request untuk debugging di CloudWatch
  console.log('Event received:', JSON.stringify(event, null, 2));
  console.log('Remaining time (ms):', context.getRemainingTimeInMillis());

  try {
    // Mendapatkan metode HTTP
    const method = event.httpMethod;
    
    // Logika routing sederhana
    if (method === 'GET') {
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*' // CORS
        },
        body: JSON.stringify({
          message: 'Halo dari Lambda!',
          timestamp: new Date().toISOString(),
          requestId: context.awsRequestId
        }),
      };
    }

    if (method === 'POST') {
      // Parsing body jika ada
      const body = event.body ? JSON.parse(event.body) : {};
      
      return {
        statusCode: 201,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Data berhasil diterima',
          receivedData: body
        }),
      };
    }

    // Response jika metode tidak didukung
    return {
      statusCode: 405,
      body: JSON.stringify({ message: `Method ${method} tidak diizinkan` }),
    };

  } catch (error) {
    console.error('Error occurred:', error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Internal Server Error',
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
    };
  }
};