public class Vehicule{
    private final String id;

    public Vehicule(String id){
        if (id==null || id.isBlank()){
            throw new IllegalArgumentException("Id is required");
        }
        this.id=id;
    }

    public String getId(){
        return id; 
    }

}