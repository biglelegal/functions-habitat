export const environment = {
  serviceAccountPath: {
    'type': 'service_account',
    'projectId': 'bigle-plataform-habitat',
    'privateKeyId': 'c1c4375e2a8f69d18e4bfdf9c94bafd9ce485324',
    'privateKey': '-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDOlAcrfjK4LosS\nNm3n8DrMa2CKnXRypm5/PdBOf3SKjuB0asObCEJIODCLMPlv9QSgITCZEcu5rp27\n0C1a6lGETkdp2cKWgeDBe8BgUcVv5FqWbXKIVc+6UrCzWLlZwn4yN1dKI0D1yvlg\nfqr8YbWTN5o19Zg5xHSHr9t9oSYK344e3ao7DBTdr0g40nLn6/fFlAWE8RRjILvE\ny5n0E9bw4LnR4JnXYTDp3KIR3opA/MEgz0nTLMd+FPYITFOoVWSvVhcAkSH+4gcG\n7zcyViJ5Gvrl4zqwCMqpaCPECWJxid5/M+XhrOj4M1LEX+BEpv0zeH0T9GB0bRRr\nB2INcARbAgMBAAECggEATSyRBycUxKkirHGoGputI7xDq1VKcSCLLD8ICKNmAvOA\nmA1guRTbSkavn/hyX2iOS1JK6Qx0axB4ffc2Un4yaPajiEBhiT/JGw9j3bf+xh/t\n1b/ap2NDgQyuVboiOI3H/nOdSSWleY3UH0ADGdlY78A4fMsdDQu/KwfAPI1M/Ic/\nBe1zeV1T4XuuouIETEpG0VqmLCO9KcQGbpn6de4QXrr2YbPdZ3Z33lykBUiXY/jQ\n7Nknvoh9rOvCckqWcM8Admhr3+Nn7YqqV977RgrPZTRL17m1EmB0DZaalwC5ZOQy\nBKgWxKyf80XlOg3r7JKSaDioRlbiUoKJXxPvZErgUQKBgQDvg2EhAjenC3BwFrBM\nhpz7pyMqSQ/H+1kjcHkDDaqL7mqYYTyjgrsGGTJUbMCFdtJRTO5YX0VwsFB8OVYM\nGam4r/DcHubuGqEyr4IMA6Hk9hd9JKzaNZRd56xlTOzeChnw8FqEMvQ2HKFwZ8bw\nzw49eoBafnIYrJCiDMtAihpLcQKBgQDczEeefydibnEtpbCAZI3pzHCZlS+VsmL6\n2usvGU5EKxW4PtdSMvYMO6aye9CXDZgwhRt+9RSDG1to7ToENLfRpT6s+sb8HVDl\ndn48k2Zf/DES4i4CSiR5Paa5vPBLZt8k9fXH6dtL3Jn0zoD1v6widKd431Oma1UA\nLTwZkGbuiwKBgHdIiBQHZa4U3V+FfTHvjLksCTBjCLABNuiWeD4UDU75Yy8WpjuM\nvRYRcGZpbwxJG/+Pf9iVQiEYPk1PxNHr6gHn5d3KqhoFOyjiDbNsD7HW+eXCYS+f\npY+K9OnSgNkoULkVCw9xzPwyEBjKJmMBy8bEfq4S8UHml3WNR6CR5vyRAoGAV5eW\nxfLtnefwcEpt5dF+VwTqmpMLiJh3GctlR48DdJmfCTOs2ggrghjb/ayOyI31FTKJ\nAOmbFJPyxIJv5KFBVyL15UurSvMaV52VYNSc5XE3yqT92ZyuMYbasI6ayV7rIU+O\nDJviiorebLbLhDJgyF583b/DAJ9N3j8Tu5SEsRcCgYBfPv9DEymn2Zq2lg3NAWvu\nKgBNtdvczU/Mro/B5hRP8b67AlmPqlcXpgWMSKyAylAm3TlDyOIWoyp34G+LZddq\nJ4GnLj5Dji4Cj/iyhBOI9RA9i1tW++3ogw/VMvpBkrnV94/WfIwyQHWZ40WLjWOV\nkXACxgOpUKMO+YJkGmhwCg==\n-----END PRIVATE KEY-----\n',
    'clientEmail': 'firebase-adminsdk-x9cor@bigle-plataform-habitat.iam.gserviceaccount.com',
    'clientId': '112419489075834960413',
    'authUri': 'https://accounts.google.com/o/oauth2/auth',
    'tokenUri': 'https://oauth2.googleapis.com/token',
    'authProviderX509CertUrl': 'https://www.googleapis.com/oauth2/v1/certs',
    'clientX509CertUrl': 'https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-x9cor%40bigle-plataform-habitat.iam.gserviceaccount.com'
  },
  databaseURL: 'https://bigle-plataform-habitat.firebaseio.com',
  storageBucket: 'bigle-plataform-habitat.appspot.com',
  apiUrl: 'bigle-plataform-habitat.firebaseapp.com',
  singleSignOn: '',
  integration: {
    // url: 'http://localhost:5000/bigle-plataform-habitat/us-central1/integration',
    url: 'https://us-central1-bigle-plataform-habitat.cloudfunctions.net/integration',
    societies: 'getSocieties',
    compraventa: 'getCompraventa'
  },
  compraventa: {
    // url: 'https://a0bdd893-b778-4cbe-a3b4-a31c51c934f1.mock.pstmn.io'
    url: 'https://ws.habitat.es:8200/sap/bc/srt/wsdl/flv_10002A111AD1/bndg_url/sap/bc/srt/rfc/sap/zhab_wscon_get_data_solicitud/100/zhab_wscon_get_data_solicitud/zhab_wscon_get_data_solicitud_binding?sap-client=100'
  }
};
