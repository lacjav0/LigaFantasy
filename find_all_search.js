const { request, gql } = require('graphql-request');
const SORARE_API_URL = 'https://api.sorare.com/graphql';
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const INTRO_QUERY = gql`
  query {
    __schema {
      types {
        name
        fields {
          name
        }
      }
    }
  }
`;

async function find() {
    try {
        const data = await request(SORARE_API_URL, INTRO_QUERY);
        const results = [];
        data.__schema.types.forEach(type => {
            if (type.fields) {
                type.fields.forEach(f => {
                    if (f.name.toLowerCase().includes('search')) {
                        results.push(`${type.name}.${f.name}`);
                    }
                });
            }
        });
        console.log('SEARCH FIELDS:', results.join(', '));
    } catch (e) {
        console.log('ERROR:', e.message);
    }
}

find();
