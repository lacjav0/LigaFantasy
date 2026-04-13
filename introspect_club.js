const { request, gql } = require('graphql-request');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const SORARE_API_URL = 'https://api.sorare.com/graphql';

const INTROSPECT_CLUB = gql`
  query IntrospectClub {
    __type(name: "Club") {
      name
      fields {
        name
        type {
          name
          kind
        }
      }
    }
  }
`;

async function test() {
    try {
        const data = await request(SORARE_API_URL, INTROSPECT_CLUB);
        console.log('Club Fields:', JSON.stringify(data.__type.fields.map(f => f.name), null, 2));
    } catch (error) {
        console.error('Introspection Failed:', error.message);
    }
}

test();
